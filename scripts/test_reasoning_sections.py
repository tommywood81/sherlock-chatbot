#!/usr/bin/env python3
"""
Quick sanity test: verify the model output includes structured sections.

It calls POST /api/generate (SSE stream) and reconstructs the streamed text.
Then checks whether the stream contains:
  - [REASONING]
  - [ANSWER] (or other answer variants supported by the frontend)

Run:
  python scripts/test_reasoning_sections.py
"""

from __future__ import annotations

import json
from typing import Iterable, Tuple
from urllib.request import Request, urlopen
from urllib.error import URLError


BASE_URL = "http://localhost:3000"
ENDPOINT = "/api/generate"

PROMPTS: list[str] = [
    "hello",
    "who is doctor watson?",
    "boots and a knife",
    "a man with muddy boots was found in a locked room; what can you deduce?",
]

MAX_TOKENS = 64
TEMPERATURE = 0.7
TOP_P = 0.9


ANSWER_MARKERS = ("[ANSWER]", "[answer]", "[FINAL ANSWER]", "[final answer]")
REASONING_MARKERS = ("[REASONING]", "[reasoning]")


def _sse_tokens_to_text(resp) -> str:
    """
    Read a SSE stream where each event is a line starting with `data:`.
    Payload may be JSON {"token": "..."} or plain token text.
    """
    text_parts: list[str] = []
    buf = b""
    while True:
        chunk = resp.read(4096)
        if not chunk:
            break
        buf += chunk
        while b"\n" in buf:
            line, _, rest = buf.partition(b"\n")
            buf = rest
            line_str = line.decode("utf-8", errors="replace").strip()
            if not line_str.startswith("data: "):
                continue
            payload = line_str[6:].strip()
            if not payload or payload == "[DONE]":
                continue
            try:
                obj = json.loads(payload)
                if isinstance(obj, dict) and "token" in obj:
                    text_parts.append(str(obj["token"]))
                else:
                    # Unexpected JSON; fall back to raw payload
                    text_parts.append(payload)
            except json.JSONDecodeError:
                text_parts.append(payload)
    return "".join(text_parts)


def _contains_any(haystack: str, markers: Iterable[str]) -> bool:
    lower = haystack
    return any(m in lower for m in markers)


def main() -> None:
    print(f"Testing structured sections via {BASE_URL}{ENDPOINT}")
    for i, prompt in enumerate(PROMPTS, start=1):
        print(f"\n[CASE {i}] prompt: {prompt!r}")
        req = Request(
            f"{BASE_URL}{ENDPOINT}",
            method="POST",
            headers={"Content-Type": "application/json"},
            data=json.dumps(
                {
                    "prompt": prompt,
                    "temperature": TEMPERATURE,
                    "top_p": TOP_P,
                    "max_tokens": MAX_TOKENS,
                }
            ).encode("utf-8"),
        )
        try:
            with urlopen(req, timeout=120) as resp:
                full_text = _sse_tokens_to_text(resp)
        except URLError as e:
            raise SystemExit(f"Failed to reach API at {BASE_URL}. Is docker compose up?\\n{e}") from e

        has_reasoning = _contains_any(full_text, REASONING_MARKERS)
        has_answer = _contains_any(full_text, ANSWER_MARKERS)
        print(f"Contains [REASONING]: {has_reasoning}")
        print(f"Contains [ANSWER]:   {has_answer}")
        excerpt = full_text.strip().replace("\n", " ")
        if len(excerpt) > 250:
            excerpt = excerpt[:250] + "..."
        print(f"Excerpt: {excerpt}")

    print("\nDONE.")


if __name__ == "__main__":
    main()

