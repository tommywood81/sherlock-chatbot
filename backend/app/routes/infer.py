"""
POST /api/infer — stream inference (legacy).
POST /api/generate — stream with params and metrics; uses [REASONING] / [ANSWER] system prompt.
"""
import json
import logging
import time
from typing import Iterator

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
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)
SYSTEM_MSG_REASONING = (
    "You are Sherlock Holmes.\n"
    "When answering:\n"
    "You MUST output exactly two sections, in this exact order, with these exact headers:\n"
    "[REASONING]\n"
    "<your reasoning>\n"
    "[ANSWER]\n"
    "<your final answer>\n"
    "\n"
    "Rules:\n"
    "- Always include the literal header [ANSWER] and at least one sentence after it.\n"
    "- Keep [REASONING] concise (1–5 short lines).\n"
    "- Give direct, varied conclusions.\n"
    "- Do not start with the phrase 'From this we may deduce that the clue in question'.\n"
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
    max_tokens: int = 64


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
    max_tokens: int = 64,
) -> Iterator[bytes]:
    """Stream JSON SSE: data: {"token": "x"} then data: {"metrics": {...}}."""
    llm = get_model()
    # Force the model to begin under the [REASONING] header so the frontend can
    # stream reasoning tokens separately from the final answer. Relying on an
    # instruction-only system prompt is often ignored by small fine-tunes.
    base_prompt = _build_prompt(prompt, system=SYSTEM_MSG_REASONING)
    full_prompt = base_prompt + "[REASONING]\n"
    start = time.perf_counter()
    token_count = 0
    try:
        # Emit the header explicitly so the frontend can parse sections even if the
        # model continues after the prompt prefix without re-printing it.
        header_payload = json.dumps({"token": "[REASONING]\n"})
        yield f"data: {header_payload}\n\n".encode("utf-8")
        # Two-phase generation:
        # 1) generate reasoning (most tokens)
        # 2) inject [ANSWER] and generate answer (remaining tokens)
        #
        # Small fine-tunes sometimes never output [ANSWER] even when instructed;
        # this guarantees a split for the frontend.
        reasoning_budget = max(16, int(max_tokens * 0.7))
        answer_budget = max(1, max_tokens - reasoning_budget)

        reasoning_chunks: list[str] = []

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

        # Phase 1: Reasoning
        stream1 = llm(
            full_prompt,
            max_tokens=reasoning_budget,
            temperature=temperature,
            top_p=top_p,
            stream=True,
            stop=[EOT],
        )
        for text in _iter_text(stream1):
            token_count += 1
            reasoning_chunks.append(text)
            payload = json.dumps({"token": text})
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
            stream=True,
            stop=[EOT],
        )
        for text in _iter_text(stream2):
            token_count += 1
            payload = json.dumps({"token": text})
            yield f"data: {payload}\n\n".encode("utf-8")
    except Exception as e:
        logger.exception("Generate error: %s", e)
        yield f"data: {json.dumps({'token': f'[Error: {e}]'})}\n\n".encode("utf-8")
    elapsed = time.perf_counter() - start
    metrics = {
        "latency_ms": round(elapsed * 1000),
        "tokens_per_second": round(token_count / elapsed, 2) if elapsed > 0 else 0,
        "tokens_generated": token_count,
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
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
