"""
Sanity test for the quantised Sherlock model used on the 4 GB droplet.

Runs the GGUF model (e.g. llama32-1b-sherlock-q4.gguf) via llama.cpp so we test
the same stack as production. Uses the same Llama chat template as training.

Requires: llama.cpp built (llama-cli), and models/llama32-1b-sherlock-q4.gguf.

On Windows: exit 130 often means backend load failed (ggml_backend_init missing in
ggml-cpu.dll)—rebuild llama.cpp with consistent CMake options. It can also mean
the process was interrupted (e.g. IDE timeout); run from a normal terminal to rule that out.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Quantised model used for inference on the droplet
GGUF_MODEL_PATH = PROJECT_ROOT / "models" / "llama32-1b-sherlock-v6-q4.gguf"

# Llama chat template (same format as training)
LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"

SYSTEM_MSG = (
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)

TEST_PROMPTS = [
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
NUM_PROMPTS_TO_RUN = 1

# Use few tokens so the test finishes in ~10-30s even on slow Windows CPU builds.
MIN_RESPONSE_CHARS = 5
MAX_NEW_TOKENS = int(os.environ.get("LLAMA_TEST_MAX_TOKENS", "15"))
# Timeout: allow slow loads; generation of 15 tokens should be < 2 min on most CPUs.
TIMEOUT_S = int(os.environ.get("LLAMA_TEST_TIMEOUT_S", "180"))


def _llama_cli_path() -> Path:
    """Default path to llama-cli (project_root/llama.cpp/build/bin/)."""
    bin_dir = PROJECT_ROOT / "llama.cpp" / "build" / "bin"
    exe = "llama-cli.exe" if sys.platform == "win32" else "llama-cli"
    return bin_dir / exe


def _build_chat_prompt(system: str, user: str) -> str:
    """Same format as training: system + user + assistant header (model continues after)."""
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n{system}\n{EOT}\n\n"
        f"{HDR_USER}\n{user}\n{EOT}\n\n"
        f"{HDR_ASSIST}\n"
    )


def _run_gguf(
    model_path: Path,
    prompt: str,
    *,
    llama_cli: Path,
    max_tokens: int = MAX_NEW_TOKENS,
    temp: float = 0.7,
    timeout_s: int = TIMEOUT_S,
) -> str:
    """Run GGUF model via llama-cli; return full stdout (prompt + generated)."""
    # On Windows CPU, -t -1 (all threads) can be slower; use a moderate count.
    # See: https://github.com/ggerganov/llama.cpp/issues/11247
    threads = min(4, os.cpu_count() or 4)
    cmd = [
        str(llama_cli),
        "-m", str(model_path.resolve()),
        "-p", prompt,
        "-n", str(max_tokens),
        "--temp", str(temp),
        "-t", str(threads),
        "-c", "512",
        "--no-display-prompt",
    ]
    # On Windows, use CREATE_NO_WINDOW so the child has no console; otherwise console
    # activity (or shared Ctrl+C) can raise spurious KeyboardInterrupt in the parent.
    # stdin=DEVNULL below stops llama-cli from waiting for interactive input.
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    if os.environ.get("LLAMA_TEST_SHOW_CMD"):
        print(f"Run manually: {' '.join(cmd)}", flush=True)
    # Close stdin so llama-cli doesn't wait for interactive input (e.g. "available commands").
    result = subprocess.run(
        cmd,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout_s,
        creationflags=creationflags,
    )
    if result.returncode != 0:
        stderr_snippet = result.stderr[:500] if result.stderr else ""
        if result.returncode == 130:
            # 130 can be SIGINT or (on Windows) backend init failure / crash.
            if "load_backend" in stderr_snippet or "ggml_backend_init" in stderr_snippet:
                raise RuntimeError(
                    "llama-cli exited 130 after backend load failure (ggml_backend_init "
                    "missing in ggml-cpu.dll). Rebuild llama.cpp with static linking: "
                    "cd <repo>/llama.cpp, then: cmake -B build -DBUILD_SHARED_LIBS=OFF . ; "
                    "cmake --build build --config Release. "
                    "See https://github.com/ggerganov/llama.cpp/issues/11700 . stderr: " + stderr_snippet
                ) from None
            raise RuntimeError(
                "llama-cli exited 130 (interrupted). "
                "On Windows, run this test from a normal terminal, not the IDE, to avoid false timeouts. "
                f"stderr: {stderr_snippet}"
            ) from None
        raise RuntimeError(
            f"llama-cli exited {result.returncode}. stderr: {stderr_snippet}"
        )
    return result.stdout.strip() or ""


def _extract_generated(stdout: str, prompt: str) -> str:
    """Take the part of stdout after the prompt (the model's continuation)."""
    if prompt in stdout:
        text = stdout.split(prompt, 1)[-1].strip()
    else:
        text = stdout.strip()
    return _strip_llama_cli_cruft(text)


def _strip_llama_cli_cruft(text: str) -> str:
    """Drop llama-cli stats and interactive lines at end (e.g. '[ Prompt: 36 t/s | Generation: 13 t/s ]', '>', 'Exiting...')."""
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
    return GGUF_MODEL_PATH.exists() and _llama_cli_path().exists()


@pytest.mark.skipif(
    not _quantised_model_available(),
    reason="GGUF model or llama-cli missing: need models/llama32-1b-sherlock-v6-q4.gguf and llama.cpp built",
)
def test_quantised_model_generates() -> None:
    """Run the quantised GGUF model via llama.cpp; assert we get a non-empty reply."""
    llama_cli = _llama_cli_path()
    prompts_to_run = TEST_PROMPTS[:NUM_PROMPTS_TO_RUN]

    for user_msg in prompts_to_run:
        prompt = _build_chat_prompt(SYSTEM_MSG, user_msg)
        print("Generating response via llama.cpp...", flush=True)
        t0 = time.perf_counter()
        stdout = _run_gguf(GGUF_MODEL_PATH, prompt, llama_cli=llama_cli)
        elapsed = time.perf_counter() - t0
        print(f"Inference time: {elapsed:.1f}s (expected ~5-30s for {MAX_NEW_TOKENS} tokens, quantized 1B on CPU)", flush=True)
        new_text = _extract_generated(stdout, prompt)
        print("\n--- Model response ---")
        print(new_text)
        print("---")
        min_chars = min(MIN_RESPONSE_CHARS, max(1, MAX_NEW_TOKENS))
        assert len(new_text) >= min_chars, (
            f"Expected at least {min_chars} characters; got {new_text!r}"
        )
