"""
POST /api/infer — stream inference responses token-by-token.
"""
import logging
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


def _build_prompt(user_message: str) -> str:
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n{SYSTEM_MSG}\n{EOT}\n\n"
        f"{HDR_USER}\n{user_message}\n{EOT}\n\n"
        f"{HDR_ASSIST}\n"
    )


class InferRequest(BaseModel):
    prompt: str


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
