"""
Run 10 questions through the quantised Sherlock model; pass if every question gets a response.

Loads the model once via llama-server (static build at build/bin/Release/llama-server.exe),
then sends all 10 questions to the same process. Same chat prompt format as test_sherlock_model.py.
Prints time per question and response.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent

GGUF_MODEL_PATH = PROJECT_ROOT / "models" / "llama32-1b-sherlock-q4.gguf"

LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"

SYSTEM_MSG = (
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)

QUESTIONS = [
    "Holmes, how did you know the visitor was a sailor?",
    "Who are you?",
    "Describe your method of deduction.",
    "What can you deduce from this hat?",
    "Watson says he sees nothing. What do you say?",
    "How do you approach a new case?",
    "Where do you live?",
    "What is the capital of France?",
    "A client brings a pipe. What might you infer?",
    "Explain why a small detail matters.",
]

MIN_RESPONSE_CHARS = 5
# Droplet-like: same as evaluation (run_eval, run_full_evaluation default 40–120)
MAX_NEW_TOKENS = int(os.environ.get("LLAMA_TEST_MAX_TOKENS", "120"))
SERVER_PORT = 15555
SERVER_WAIT_S = 60
SERVER_START_POLL_S = 2


def _llama_server_path() -> Path:
    """Static build: build/bin/Release/llama-server.exe (Windows) or build/bin/llama-server (Linux)."""
    exe = "llama-server.exe" if sys.platform == "win32" else "llama-server"
    if sys.platform == "win32":
        return PROJECT_ROOT / "llama.cpp" / "build" / "bin" / "Release" / exe
    return PROJECT_ROOT / "llama.cpp" / "build" / "bin" / exe


def _build_chat_prompt(system: str, user: str) -> str:
    """Same format as training: system + user + assistant header (model continues after)."""
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n{system}\n{EOT}\n\n"
        f"{HDR_USER}\n{user}\n{EOT}\n\n"
        f"{HDR_ASSIST}\n"
    )


def _start_server(model_path: Path, server_exe: Path) -> subprocess.Popen:
    """Start llama-server with model; returns process. Uses CREATE_NO_WINDOW on Windows."""
    cmd = [
        str(server_exe),
        "-m", str(model_path.resolve()),
        "--host", "127.0.0.1",
        "--port", str(SERVER_PORT),
        "-c", "512",
        "-n", str(MAX_NEW_TOKENS),
    ]
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        creationflags=creationflags,
    )
    return proc


def _wait_for_server(port: int, timeout_s: float = SERVER_WAIT_S) -> None:
    """Poll until server accepts a completion (model loaded)."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            # Minimal request to confirm server and model are ready
            _completion_request(port, "X", timeout_s=90)
            return
        except (urllib.error.URLError, OSError, json.JSONDecodeError, KeyError, TypeError):
            pass
        time.sleep(SERVER_START_POLL_S)
    raise RuntimeError(f"Server did not become ready within {timeout_s}s")


def _completion_request(port: int, prompt: str, timeout_s: int = 120) -> str:
    """POST /completion; return generated text (content field)."""
    url = f"http://127.0.0.1:{port}/completion"
    body = json.dumps({
        "prompt": prompt,
        "n_predict": MAX_NEW_TOKENS,
        "temperature": 0.7,
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout_s) as r:
        data = json.loads(r.read().decode("utf-8"))
    # llama.cpp server: "content" or "text"; OpenAI compat: choices[0].text
    content = data.get("content") or data.get("text")
    if content is None and "choices" in data and data["choices"]:
        content = data["choices"][0].get("text") or data["choices"][0].get("message", {}).get("content")
    if isinstance(content, list):
        content = content[0] if content else ""
    return (content or "").strip()


def _strip_server_cruft(text: str) -> str:
    """Drop stats/cruft lines at end if any."""
    lines = text.splitlines()
    kept = []
    for line in lines:
        if "[ Prompt:" in line or ("t/s" in line and "|" in line):
            break
        if line.strip() in (">", "Exiting..."):
            continue
        kept.append(line)
    return "\n".join(kept).strip()


def _quantised_model_available() -> bool:
    return GGUF_MODEL_PATH.exists() and _llama_server_path().exists()


@pytest.mark.skipif(
    not _quantised_model_available(),
    reason="Need models/llama32-1b-sherlock-q4.gguf and static build: build/bin/Release/llama-server.exe",
)
def test_10_questions_get_responses() -> None:
    """Load model once via llama-server, then send 10 questions to the same process."""
    server_exe = _llama_server_path()
    min_chars = min(MIN_RESPONSE_CHARS, max(1, MAX_NEW_TOKENS))

    print("\n--- Starting llama-server (model loaded once) ---", flush=True)
    proc = _start_server(GGUF_MODEL_PATH, server_exe)
    try:
        _wait_for_server(SERVER_PORT)
        print("Server ready.", flush=True)
        print("\n--- 10 questions ---", flush=True)

        for i, question in enumerate(QUESTIONS, 1):
            prompt = _build_chat_prompt(SYSTEM_MSG, question)
            t0 = time.perf_counter()
            response = _completion_request(SERVER_PORT, prompt)
            elapsed = time.perf_counter() - t0
            response = _strip_server_cruft(response)

            print(f"\n[{i}/10] Time: {elapsed:.1f}s", flush=True)
            print(f"  Q: {question}", flush=True)
            print(f"  A: {response}", flush=True)

            assert len(response) >= min_chars, (
                f"Question {i}: expected at least {min_chars} characters; got {response!r}"
            )

        print("\n--- All 10 questions received a response ---", flush=True)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
