"""
Extended tests for the quantised Sherlock model: memorisation and generalisation.

Uses the same stack as test_sherlock_model.py (llama-cli, GGUF, Llama chat template).
One quick memorisation test and one quick generalisation test.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent

GGUF_MODEL_PATH = PROJECT_ROOT / "models" / "llama32-1b-sherlock-v6-q4.gguf"

LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"

SYSTEM_MSG = (
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)

# Same as test_sherlock_model.py so behaviour is identical.
MIN_RESPONSE_CHARS = 5
MAX_NEW_TOKENS = int(os.environ.get("LLAMA_TEST_MAX_TOKENS", "15"))
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
    """Run GGUF model via llama-cli; return full stdout (prompt + generated). Same as test_sherlock_model.py."""
    # On Windows CPU, -t -1 (all threads) can be slower; use a moderate count.
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
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    if os.environ.get("LLAMA_TEST_SHOW_CMD"):
        print(f"Run manually: {' '.join(cmd)}", flush=True)
    # Close stdin so llama-cli doesn't wait for interactive input.
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
        return stdout.split(prompt, 1)[-1].strip()
    return stdout.strip()


def _quantised_model_available() -> bool:
    return GGUF_MODEL_PATH.exists() and _llama_cli_path().exists()


def _run_one_prompt(user_msg: str, llama_cli: Path) -> str:
    """Build prompt, run GGUF, return model output only."""
    prompt = _build_chat_prompt(SYSTEM_MSG, user_msg)
    stdout = _run_gguf(GGUF_MODEL_PATH, prompt, llama_cli=llama_cli)
    return _extract_generated(stdout, prompt)


@pytest.mark.skipif(
    not _quantised_model_available(),
    reason="GGUF model or llama-cli missing: need models/llama32-1b-sherlock-v6-q4.gguf and llama.cpp built",
)
def test_quantised_model_memorisation() -> None:
    """Memorisation: model should recall who Sherlock Holmes is (name, role, location)."""
    user_msg = "Who is Sherlock Holmes?"
    keywords = ["Holmes", "detective", "Baker", "consulting"]
    llama_cli = _llama_cli_path()

    print("\n--- test_quantised_model_memorisation ---", flush=True)
    print("Test: model recalls who Sherlock Holmes is (at least one of {})".format(keywords), flush=True)
    print("Sent (user):", user_msg, flush=True)

    t0 = time.perf_counter()
    output = _run_one_prompt(user_msg, llama_cli)
    elapsed = time.perf_counter() - t0

    print("Received (model):", output, flush=True)
    print("Inference time: {:.1f}s".format(elapsed), flush=True)

    assert len(output.strip()) >= MIN_RESPONSE_CHARS, f"Expected non-empty reply; got {output!r}"
    output_lower = output.lower()
    found = [k for k in keywords if k.lower() in output_lower]
    print("Check: at least one keyword in reply -> found: {}".format(found), flush=True)
    assert len(found) >= 1, (
        f"Memorisation: expected at least one of {keywords} in reply; got {output!r}"
    )
    print("PASSED\n", flush=True)


@pytest.mark.skipif(
    not _quantised_model_available(),
    reason="GGUF model or llama-cli missing: need models/llama32-1b-sherlock-v6-q4.gguf and llama.cpp built",
)
def test_quantised_model_generalisation() -> None:
    """Generalisation: model should apply deduction to a new scenario (hat)."""
    user_msg = "A client brings a hat. What can you deduce from it?"
    keywords = ["observe", "deduce", "evidence", "infer", "conclude", "see"]
    llama_cli = _llama_cli_path()

    print("\n--- test_quantised_model_generalisation ---", flush=True)
    print("Test: model applies deduction to a new scenario (at least one of {})".format(keywords), flush=True)
    print("Sent (user):", user_msg, flush=True)

    t0 = time.perf_counter()
    output = _run_one_prompt(user_msg, llama_cli)
    elapsed = time.perf_counter() - t0

    print("Received (model):", output, flush=True)
    print("Inference time: {:.1f}s".format(elapsed), flush=True)

    assert len(output.strip()) >= MIN_RESPONSE_CHARS, f"Expected non-empty reply; got {output!r}"
    output_lower = output.lower()
    found = [k for k in keywords if k.lower() in output_lower]
    print("Check: at least one reasoning keyword in reply -> found: {}".format(found), flush=True)
    assert len(found) >= 1, (
        f"Generalisation: expected at least one reasoning keyword from {keywords}; got {output!r}"
    )
    print("PASSED\n", flush=True)
