"""
POST /api/infer — stream inference (legacy).
POST /api/generate — stream with params and metrics; uses [REASONING] / [ANSWER] system prompt.
"""
import json
import logging
import time
import math
from typing import Iterator, List, Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..model import get_model
from ..config import MAX_TOKENS, TEMPERATURE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["infer"])

# Llama 3.2 chat template (same as training/evaluation)
LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"
SYSTEM_MSG = (
    "You are Sherlock, an AI assistant that provides clear, accurate answers in natural language. "
    "Maintain a calm, analytical tone. Do not roleplay. Do not expose raw chain-of-thought. "
    "Keep responses concise and readable."
)
SYSTEM_MSG_REASONING = (
    "You are Sherlock, an AI assistant that provides clear, accurate answers in natural language.\n"
    "Maintain a calm, analytical tone. Do not roleplay. Do not expose raw chain-of-thought.\n"
    "\n"
    "When reasoning is requested:\n"
    "- Output a short, structured reasoning summary (no raw chain-of-thought).\n"
    "- Then output the final answer.\n"
    "\n"
    "Format (for UI parsing):\n"
    "[REASONING]\n"
    "<structured reasoning summary>\n"
    "[ANSWER]\n"
    "<final answer>\n"
)


def _build_prompt(user_message: str, system: str = SYSTEM_MSG) -> str:
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n{system}\n{EOT}\n\n"
        f"{HDR_USER}\n{user_message}\n{EOT}\n\n"
        f"{HDR_ASSIST}\n"
    )


class InferRequest(BaseModel):
    prompt: str


class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 256
    show_reasoning: bool = False


def _extract_alternatives_from_chunk(chunk: Dict[str, Any], k: int = 5) -> List[Dict[str, float | str]]:
    """
    Try to extract top-k token alternatives from llama.cpp stream chunk.
    Returns a list of {"token": str, "prob": float} sorted by probability desc.
    """
    choices = chunk.get("choices") or []
    if not choices:
        return []
    c0 = choices[0] or {}
    logprobs_obj = c0.get("logprobs") or {}
    top_logprobs = logprobs_obj.get("top_logprobs")
    # Common shape for completion streaming: list[dict[token, logprob]]
    if isinstance(top_logprobs, list) and top_logprobs:
        first = top_logprobs[0]
        if isinstance(first, dict):
            out: List[Dict[str, float | str]] = []
            for tok, lp in first.items():
                try:
                    prob = float(math.exp(float(lp)))
                except Exception:
                    continue
                out.append({"token": str(tok), "prob": prob})
            out.sort(key=lambda x: float(x["prob"]), reverse=True)
            return out[:k]
    return []


def _confidence_from_alternatives(
    selected_text: str,
    alternatives: List[Dict[str, float | str]],
) -> float | None:
    """
    Compute a token-level confidence from top-k alternatives.

    Prefer the probability of the *selected* token if it exists in the alternatives;
    otherwise fall back to the best alternative's probability.
    """
    if not alternatives:
        return None

    for alt in alternatives:
        if alt.get("token") == selected_text:
            prob = alt.get("prob")
            if isinstance(prob, (int, float)):
                return float(prob)

    best = alternatives[0]
    prob = best.get("prob")
    if isinstance(prob, (int, float)):
        return float(prob)
    return None


def _stream_sse(prompt: str, max_tokens: int = MAX_TOKENS) -> Iterator[bytes]:
    """Sync generator: yield SSE 'data: token' lines. FastAPI runs this in a thread."""
    llm = get_model()
    full_prompt = _build_prompt(prompt)
    try:
        stream = llm(
            full_prompt,
            max_tokens=max_tokens,
            temperature=TEMPERATURE,
            stream=True,
            stop=[EOT],
        )
        for chunk in stream:
            choices = chunk.get("choices")
            if not choices:
                continue
            c0 = choices[0]
            text = (
                c0.get("text")
                or c0.get("content")
                or (c0.get("delta") or {}).get("content")
                or ""
            )
            if text:
                yield f"data: {text}\n\n".encode("utf-8")
    except Exception as e:
        logger.exception("Inference error: %s", e)
        yield f"data: [Error: {e}]\n\n".encode("utf-8")


def _stream_generate_sse(
    prompt: str,
    temperature: float = 0.7,
    top_p: float = 0.9,
    max_tokens: int = 256,
    show_reasoning: bool = False,
) -> Iterator[bytes]:
    """Stream JSON SSE: data: {"token": "x"} then data: {"metrics": {...}}."""
    llm = get_model()
    system = SYSTEM_MSG_REASONING if show_reasoning else SYSTEM_MSG
    base_prompt = _build_prompt(prompt, system=system)
    full_prompt = base_prompt + ("[REASONING]\n" if show_reasoning else "")
    start = time.perf_counter()
    token_count = 0
    confidences: list[float] = []
    try:
        def _iter_text(stream_obj):
            for chunk in stream_obj:
                choices = chunk.get("choices")
                if not choices:
                    continue
                c0 = choices[0]
                text = (
                    c0.get("text")
                    or c0.get("content")
                    or (c0.get("delta") or {}).get("content")
                    or ""
                )
                if text:
                    yield text

        if not show_reasoning:
            stream = llm(
                full_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                logprobs=5,
                stream=True,
                stop=[EOT],
            )
            for chunk in stream:
                text_iter = _iter_text([chunk])
                text = next(text_iter, "")
                if not text:
                    continue
                token_count += 1
                alternatives = _extract_alternatives_from_chunk(chunk)
                conf = _confidence_from_alternatives(text, alternatives)
                if conf is not None:
                    confidences.append(conf)
                payload = json.dumps({"token": text, "alternatives": alternatives})
                yield f"data: {payload}\n\n".encode("utf-8")
        else:
            # Emit the header explicitly so the frontend can parse sections even if the
            # model continues after the prompt prefix without re-printing it.
            header_payload = json.dumps({"token": "[REASONING]\n"})
            yield f"data: {header_payload}\n\n".encode("utf-8")

            # Two-phase generation:
            # 1) generate reasoning
            # 2) inject [ANSWER] and generate answer
            #
            # Ensure the answer budget is large enough to avoid “suddenly short” outputs.
            min_answer = 64
            min_reasoning = 64
            reasoning_budget = min(max_tokens - min_answer, max(min_reasoning, int(max_tokens * 0.55)))
            answer_budget = max_tokens - reasoning_budget

            reasoning_chunks: list[str] = []

            # Phase 1: Reasoning
            stream1 = llm(
                full_prompt,
                max_tokens=reasoning_budget,
                temperature=temperature,
                top_p=top_p,
                logprobs=5,
                stream=True,
                stop=[EOT],
            )
            for chunk in stream1:
                text_iter = _iter_text([chunk])
                text = next(text_iter, "")
                if not text:
                    continue
                token_count += 1
                reasoning_chunks.append(text)
                alternatives = _extract_alternatives_from_chunk(chunk)
                conf = _confidence_from_alternatives(text, alternatives)
                if conf is not None:
                    confidences.append(conf)
                payload = json.dumps({"token": text, "alternatives": alternatives})
                yield f"data: {payload}\n\n".encode("utf-8")

            # Inject answer header
            answer_header_payload = json.dumps({"token": "\n[ANSWER]\n"})
            yield f"data: {answer_header_payload}\n\n".encode("utf-8")

            # Phase 2: Answer. Prompt includes the reasoning already generated so the
            # answer can be consistent with it.
            reasoning_text = "".join(reasoning_chunks).strip()
            prompt2 = f"{full_prompt}{reasoning_text}\n[ANSWER]\n"
            stream2 = llm(
                prompt2,
                max_tokens=answer_budget,
                temperature=temperature,
                top_p=top_p,
                logprobs=5,
                stream=True,
                stop=[EOT],
            )
            for chunk in stream2:
                text_iter = _iter_text([chunk])
                text = next(text_iter, "")
                if not text:
                    continue
                token_count += 1
                alternatives = _extract_alternatives_from_chunk(chunk)
                conf = _confidence_from_alternatives(text, alternatives)
                if conf is not None:
                    confidences.append(conf)
                payload = json.dumps({"token": text, "alternatives": alternatives})
                yield f"data: {payload}\n\n".encode("utf-8")
    except Exception as e:
        logger.exception("Generate error: %s", e)
        yield f"data: {json.dumps({'token': f'[Error: {e}]'})}\n\n".encode("utf-8")
    elapsed = time.perf_counter() - start
    confidence_avg = (sum(confidences) / len(confidences)) if confidences else None
    metrics = {
        "latency_ms": round(elapsed * 1000),
        "tokens_per_second": round(token_count / elapsed, 2) if elapsed > 0 else 0,
        "tokens_generated": token_count,
        "confidence": confidence_avg,
    }
    yield f"data: {json.dumps({'metrics': metrics})}\n\n".encode("utf-8")


@router.post("/infer")
def infer(req: InferRequest):
    """Stream model response token-by-token via Server-Sent Events."""
    if not (req.prompt or "").strip():
        raise HTTPException(status_code=400, detail="prompt is required")
    return StreamingResponse(
        _stream_sse(req.prompt.strip()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/generate")
def generate(req: GenerateRequest):
    """Stream with temperature/top_p/max_tokens; [REASONING]/[ANSWER] system prompt; metrics at end."""
    if not (req.prompt or "").strip():
        raise HTTPException(status_code=400, detail="prompt is required")
    return StreamingResponse(
        _stream_generate_sse(
            req.prompt.strip(),
            temperature=req.temperature,
            top_p=req.top_p,
            max_tokens=req.max_tokens,
            show_reasoning=req.show_reasoning,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
