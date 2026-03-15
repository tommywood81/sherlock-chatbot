"""
Full validation run for the Sherlock GGUF model.

Uses the same inference stack as tests/test_sherlock_model.py (llama-cli,
CREATE_NO_WINDOW on Windows, prompt extraction). Runs the benchmark with
per-prompt timing and writes results for the evaluation page.

Usage:
    python evaluation/run_full_evaluation.py --fast   # ~8 prompts, 25 tokens, 60s timeout (~5–15 min)
    python evaluation/run_full_evaluation.py --quick  # ~8 prompts, default tokens/timeout
    python evaluation/run_full_evaluation.py          # full 42 prompts (default -n 40, --timeout 90)
Default model: models/llama32-1b-sherlock-q4.gguf (same quantized HF3.2-1b as tests).
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))
from scoring import load_benchmark, score_text, passed

PROJECT_ROOT = _script_dir.parent

# Llama chat template (same as test_sherlock_model and training)
LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"

SYSTEM_MSG = (
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)


def _llama_cli_path(custom: Path | None = None) -> Path:
    """Same as tests/test_sherlock_model: build/bin/ so evaluation uses the same binary as the test."""
    if custom and custom.exists():
        return custom
    exe = "llama-cli.exe" if sys.platform == "win32" else "llama-cli"
    return PROJECT_ROOT / "llama.cpp" / "build" / "bin" / exe


def _build_chat_prompt(system: str, user: str) -> str:
    """Same format as training and test."""
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
    max_tokens: int = 120,
    temp: float = 0.7,
    timeout_s: int = 300,
    create_no_window: bool = True,
) -> str:
    """Run GGUF via llama-cli; same pattern as tests/test_sherlock_model (subprocess.run, no polling)."""
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
    # Match test_sherlock_model exactly: only CREATE_NO_WINDOW (no CREATE_NEW_PROCESS_GROUP).
    creationflags = 0
    if sys.platform == "win32" and create_no_window:
        creationflags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    if os.environ.get("LLAMA_TEST_SHOW_CMD"):
        print(f"Run manually: {' '.join(cmd)}", flush=True)
    # Blocking run like the test: avoids interruptible time.sleep() that caused spurious KeyboardInterrupt.
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
        stderr_snippet = (result.stderr or "")[:500]
        if result.returncode == 130:
            if "load_backend" in stderr_snippet or "ggml_backend_init" in stderr_snippet:
                raise RuntimeError(
                    "llama-cli exited 130 after backend load failure (ggml_backend_init "
                    "missing). Rebuild llama.cpp with static linking. stderr: " + stderr_snippet
                ) from None
            raise RuntimeError(
                "llama-cli exited 130 (interrupted or backend issue). "
                "Run from a normal terminal, not the IDE. stderr: " + stderr_snippet
            ) from None
        raise RuntimeError(
            f"llama-cli exited {result.returncode}. stderr: {stderr_snippet}"
        ) from None
    return (result.stdout or "").strip() or ""


def _extract_generated(stdout: str, prompt: str) -> str:
    """Take only the model's continuation (after the prompt)."""
    if prompt in stdout:
        return stdout.split(prompt, 1)[-1].strip()
    return stdout.strip()


def _behaviour_summary(output: str, max_len: int = 90) -> str:
    """Short summary of model behaviour for the evaluation page."""
    text = output.strip().replace("\n", " ")
    if len(text) <= max_len:
        return text or "(no output)"
    return text[: max_len - 3].rsplit(" ", 1)[0] + "..."


def _sanity_test_output(
    model_path: Path,
    llama_cli: Path,
    *,
    max_tokens: int = 15,
    timeout_s: int = 180,
    create_no_window: bool = True,
) -> tuple[bool, str]:
    """
    Run one simple prompt to verify the model can produce output.
    Returns (success, message).
    """
    prompt = _build_chat_prompt(SYSTEM_MSG, "Who are you?")
    try:
        stdout = _run_gguf(
            model_path,
            prompt,
            llama_cli=llama_cli,
            max_tokens=max_tokens,
            temp=0.7,
            timeout_s=timeout_s,
            create_no_window=create_no_window,
        )
        output = _extract_generated(stdout, prompt)
        if output and len(output.strip()) >= 3:
            return True, f"Output test passed ({len(output)} chars)"
        return False, "Output test failed: model returned empty or too short"
    except Exception as e:
        return False, str(e)


def main() -> None:
    print("run_full_evaluation starting...", flush=True)
    parser = argparse.ArgumentParser(description="Full evaluation with timing (same stack as test)")
    parser.add_argument(
        "--model", "-m",
        default="models/llama32-1b-sherlock-q4.gguf",
        help="Path to GGUF model (default: quantized HF3.2-1b same as test)",
    )
    parser.add_argument("--benchmark", "-b", default=None, help="Benchmark JSON path")
    parser.add_argument("--results", "-o", default=None, help="Output results.json path")
    parser.add_argument("--llama-cli", default=None, help="Path to llama-cli")
    parser.add_argument("--max-tokens", "-n", type=int, default=40, help="Max tokens per response (lower = faster on CPU)")
    parser.add_argument("--temp", type=float, default=0.7)
    parser.add_argument("--timeout", type=int, default=90, help="Seconds per prompt before abort (default 90)")
    parser.add_argument("--quick", "-q", action="store_true", help="Run 2 prompts per category (~8 total) for fast validation")
    parser.add_argument("--fast", "-f", action="store_true", help="Same as --quick with -n 25 --timeout 60 (finish in ~5–15 min on CPU)")
    parser.add_argument("--show-window", action="store_true", help="Don't use CREATE_NO_WINDOW; can fix exit 130 in Cursor/IDE terminals")
    args = parser.parse_args()

    if args.fast:
        args.quick = True
        args.max_tokens = 25
        args.timeout = 60
        print("Fast mode: --quick, -n 25, --timeout 60", flush=True)

    benchmark_path = Path(args.benchmark) if args.benchmark else _script_dir / "benchmark.json"
    results_path = Path(args.results) if args.results else PROJECT_ROOT / "results" / "results.json"
    results_path.parent.mkdir(parents=True, exist_ok=True)

    model_path = Path(args.model)
    if not model_path.is_absolute():
        model_path = (PROJECT_ROOT / model_path).resolve()
    llama_cli = _llama_cli_path(Path(args.llama_cli) if args.llama_cli else None)
    if not llama_cli.exists():
        raise FileNotFoundError(f"llama-cli not found at {llama_cli}")
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    create_no_window = not args.show_window

    # First run includes model load; always use 5 min so --fast (60s) doesn't kill the sanity test.
    SANITY_TIMEOUT_S = 300
    print("Output sanity test (1 prompt, %ds timeout for model load)..." % SANITY_TIMEOUT_S, flush=True)
    try:
        ok, msg = _sanity_test_output(
            model_path,
            llama_cli,
            max_tokens=min(args.max_tokens, 15),
            timeout_s=SANITY_TIMEOUT_S,
            create_no_window=create_no_window,
        )
    except KeyboardInterrupt:
        print("  Interrupted. If you didn't press Ctrl+C, try running from a normal terminal or without --show-window.", flush=True)
        sys.exit(130)
    if not ok:
        print(f"  FAILED: {msg}", flush=True)
        if "timed out" in msg:
            print("  First run includes model load and can take 2–5 min on CPU. Try: python evaluation/run_full_evaluation.py --timeout 300", flush=True)
        else:
            print("  Fix the output issue (e.g. rebuild llama.cpp with static linking) before running the full benchmark.", flush=True)
        sys.exit(1)
    print(f"  {msg}", flush=True)
    print()

    all_items = load_benchmark(benchmark_path)
    if args.quick:
        # 2 per category for fast validation
        cat_groups: dict[str, list] = {}
        for item in all_items:
            c = item.get("category", "unknown")
            cat_groups.setdefault(c, []).append(item)
        items = []
        for cat_items in cat_groups.values():
            items.extend(cat_items[:2])
    else:
        items = all_items

    results_list: list[dict] = []
    by_category: dict[str, list[tuple[bool, float]]] = {}
    timings: list[float] = []

    for i, item in enumerate(items):
        test_id = item.get("id", f"test_{i+1:03d}")
        category = item.get("category", "unknown")
        user_prompt = item.get("prompt", "")
        keywords = item.get("keywords", [])
        full_prompt = _build_chat_prompt(SYSTEM_MSG, user_prompt)

        print(f"  [{i+1}/{len(items)}] {test_id} ({category})...", flush=True)
        try:
            t0 = time.perf_counter()
            stdout = _run_gguf(
                model_path,
                full_prompt,
                llama_cli=llama_cli,
                max_tokens=args.max_tokens,
                temp=args.temp,
                timeout_s=args.timeout,
                create_no_window=create_no_window,
            )
            elapsed = time.perf_counter() - t0
            output = _extract_generated(stdout, full_prompt)
        except KeyboardInterrupt:
            print("  Interrupted. If you didn't press Ctrl+C, try running from a normal terminal or without --show-window.", flush=True)
            sys.exit(130)
        except Exception as e:
            print(f"    Error: {e}", flush=True)
            output = ""
            elapsed = 0.0

        has_output = bool(output and len(output.strip()) >= 3)
        score = score_text(output, keywords)
        p = passed(score)
        timings.append(elapsed)
        by_category.setdefault(category, []).append((p, elapsed))

        results_list.append({
            "id": test_id,
            "category": category,
            "prompt": user_prompt,
            "output": output[:2000],
            "behaviour_summary": _behaviour_summary(output),
            "keywords": keywords,
            "score": score,
            "passed": p,
            "has_output": has_output,
            "response_time_s": round(elapsed, 2),
        })

        # Pause between prompts so Windows can clean up; reduces exit 130 on sequential spawns.
        if i < len(items) - 1:
            time.sleep(1 if args.fast else 2)

    total = len(results_list)
    output_count = sum(1 for r in results_list if r.get("has_output"))
    passed_count = sum(1 for r in results_list if r["passed"])
    pass_rate = passed_count / total if total else 0.0
    output_rate = output_count / total if total else 0.0
    avg_time = sum(timings) / len(timings) if timings else 0.0

    by_category_rates: dict[str, dict] = {}
    for cat, vals in by_category.items():
        n = len(vals)
        passed_n = sum(1 for p, _ in vals if p)
        by_category_rates[cat] = {
            "total": n,
            "passed": passed_n,
            "pass_rate": passed_n / n if n else 0.0,
        }

    payload = {
        "model": str(model_path),
        "total_tests": total,
        "output_count": output_count,
        "output_rate": round(output_rate, 4),
        "passed": passed_count,
        "pass_rate": round(pass_rate, 4),
        "avg_response_time_s": round(avg_time, 2),
        "by_category": by_category_rates,
        "results": results_list,
    }

    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print()
    print("Results summary")
    print("--------------")
    print(f"  Total:        {total}")
    print(f"  With output:  {output_count}/{total} ({output_rate:.1%})  <- fix this first if < 100%")
    print(f"  Passed:       {passed_count} ({pass_rate:.1%})")
    print(f"  Avg time:     {avg_time:.1f}s per prompt")
    for cat, stats in by_category_rates.items():
        print(f"    {cat}: {stats['pass_rate']:.1%} ({stats['passed']}/{stats['total']})")
    print(f"  Saved to:     {results_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", flush=True)
        raise
