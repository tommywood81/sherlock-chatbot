#!/usr/bin/env python3
"""
Ask the Sherlock model several questions via the API and print results.
Run with the stack up: docker compose up (then in another terminal: python scripts/ask_model.py)
Uses http://localhost:3000/api/generate (frontend proxies to backend).
"""
import json
import re
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

BASE_URL = "http://localhost:3000"
MAX_TOKENS = 128

QUESTIONS = [
    "Who are you?",
    "A client brings a hat. What can you deduce from it?",
    "Why did the dog not bark in the night?",
    "What might muddy boots tell you about a visitor?",
    "What is your method of deduction?",
    "What is two plus two?",
]


def stream_generate(question: str) -> tuple[str, dict]:
    """POST /api/generate; return (full_text, metrics)."""
    url = f"{BASE_URL}/api/generate"
    body = json.dumps({
        "prompt": question,
        "temperature": 0.7,
        "top_p": 0.9,
        "max_tokens": MAX_TOKENS,
    }).encode("utf-8")
    req = Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urlopen(req, timeout=120) as resp:
            chunks = []
            metrics = {}
            buffer = b""
            while True:
                block = resp.read(4096)
                if not block:
                    break
                buffer += block
                while b"\n" in buffer or b"\n\n" in buffer:
                    line, _, buffer = buffer.partition(b"\n")
                    line = line.decode("utf-8", errors="replace").strip()
                    if line.startswith("data: "):
                        payload = line[6:].strip()
                        if not payload or payload == "[DONE]":
                            continue
                        try:
                            data = json.loads(payload)
                            if "token" in data:
                                chunks.append(data["token"])
                            if "metrics" in data:
                                metrics = data["metrics"]
                        except json.JSONDecodeError:
                            if payload and not payload.startswith("[Error:"):
                                chunks.append(payload)
            text = "".join(chunks)
            return text, metrics
    except URLError as e:
        raise SystemExit(f"Cannot reach API at {BASE_URL}. Is the stack running? (docker compose up)\n{e}")
    except HTTPError as e:
        raise SystemExit(f"API error: {e.code} {e.reason}\n{e.read().decode()}")


def main() -> None:
    print("Asking Sherlock model (via API). Base URL:", BASE_URL)
    print("Max tokens per reply:", MAX_TOKENS)
    print("-" * 60)
    results = []
    for i, q in enumerate(QUESTIONS, 1):
        print(f"\n[Q{i}] {q}")
        try:
            text, metrics = stream_generate(q)
        except SystemExit:
            raise
        tokens = metrics.get("tokens_generated", "?")
        sec = metrics.get("latency_ms")
        sec_str = f"{sec} ms" if sec is not None else "?"
        print(f"    -> {tokens} tokens, {sec_str}")
        print(f"    Response:\n    {text[:800]}{'...' if len(text) > 800 else ''}")
        results.append({"question": q, "text": text, "metrics": metrics})
    print("\n" + "=" * 60)
    print("ANALYSIS")
    print("=" * 60)
    overfit_phrase = "from this we may deduce that the clue in question"
    repeated = sum(1 for r in results if overfit_phrase.lower() in r["text"].lower())
    has_reasoning = sum(1 for r in results if "[REASONING]" in r["text"] or "[ANSWER]" in r["text"])
    coherent_answers = 0
    for r in results:
        t = r["text"].strip().lower()
        # Very short or mostly punctuation
        if len(t) < 15:
            continue
        # Ends with complete word/sentence
        if t.endswith((".", "!", "?")) or (len(t) > 30 and not t.endswith("—")):
            coherent_answers += 1
        # Contains at least one full sentence
        elif re.search(r"[.!?]\s+[a-z]|[.!?]$", t):
            coherent_answers += 1
        else:
            coherent_answers += 0.5  # partial
    print(f"  - Questions asked: {len(QUESTIONS)}")
    print(f"  - Responses containing the overfitted phrase ('{overfit_phrase[:40]}...'): {repeated}/{len(results)}")
    print(f"  - Responses with [REASONING]/[ANSWER] structure: {has_reasoning}/{len(results)}")
    print(f"  - Responses that look like complete answers: ~{coherent_answers}/{len(results)}")
    if repeated >= len(results) / 2:
        print("\n  Verdict: Model is heavily repeating a training phrase; outputs look overfitted.")
    elif coherent_answers < len(results) / 2:
        print("\n  Verdict: Many replies are short or incomplete; model may be underperforming or max_tokens too low.")
    else:
        print("\n  Verdict: Model is producing structured, varied answers; not purely overfitted gibberish.")
    print()


if __name__ == "__main__":
    main()
    sys.exit(0)
