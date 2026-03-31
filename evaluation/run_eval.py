"""
Run the benchmark against a single GGUF model via llama.cpp.

Usage:
    python evaluation/run_eval.py --model path/to/model.gguf
    python evaluation/run_eval.py --model model.gguf --llama-cli path/to/llama-cli

Uses only stdlib: json, subprocess, argparse.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))
from scoring import load_benchmark, score_text, passed

# Llama chat template (same format as training) so the model continues as assistant
LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"

SYSTEM_MSG = (
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)


def build_chat_prompt(user_message: str) -> str:
    """Format user message as system + user + assistant header; model continues after."""
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n{SYSTEM_MSG}\n{EOT}\n\n"
        f"{HDR_USER}\n{user_message}\n{EOT}\n\n"
        f"{HDR_ASSIST}\n"
    )


def run_model(
    model_path: Path,
    prompt: str,
    *,
    llama_cli_path: Path | None = None,
    max_tokens: int = 120,
    temp: float = 0.4,
    timeout_s: int = 300,
) -> str:
    """
    Run the GGUF model via llama.cpp subprocess and return the generated text.

    Args:
        model_path: Path to the .gguf model file.
        prompt: Full prompt string (e.g. chat-formatted).
        llama_cli_path: Path to llama-cli (or llama-cli.exe). If None, inferred from project root.
        max_tokens: Max new tokens to generate (-n).
        temp: Sampling temperature (--temp).
        timeout_s: Subprocess timeout in seconds.

    Returns:
        stdout from the process (generated text; may include prompt echo depending on binary).
    """
    if llama_cli_path is None:
        # Default: project_root/llama.cpp/build/bin/llama-cli[.exe]
        script_dir = Path(__file__).resolve().parent
        project_root = script_dir.parent
        bin_dir = project_root / "llama.cpp" / "build" / "bin"
        exe = "llama-cli.exe" if sys.platform == "win32" else "llama-cli"
        llama_cli_path = bin_dir / exe

    if not llama_cli_path.exists():
        raise FileNotFoundError(
            f"llama-cli not found at {llama_cli_path}. "
            "Build llama.cpp or pass --llama-cli path/to/llama-cli"
        )
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    cmd = [
        str(llama_cli_path),
        "-m", str(Path(model_path).resolve()),
        "-p", prompt,
        "-n", str(max_tokens),
        "--temp", str(temp),
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout_s,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"llama-cli exited with code {result.returncode}. stderr: {result.stderr[:500]}"
        )
    return result.stdout.strip() or ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Run benchmark evaluation on a GGUF model")
    parser.add_argument("--model", "-m", required=True, help="Path to GGUF model file")
    parser.add_argument("--benchmark", "-b", default=None, help="Path to benchmark.json (default: evaluation/benchmark.json)")
    parser.add_argument("--results", "-o", default=None, help="Path to output results.json (default: results/results.json)")
    parser.add_argument("--llama-cli", default=None, help="Path to llama-cli executable")
    parser.add_argument("--max-tokens", "-n", type=int, default=120, help="Max new tokens per prompt")
    parser.add_argument("--temp", type=float, default=0.4, help="Sampling temperature")
    parser.add_argument("--timeout", type=int, default=300, help="Timeout per prompt in seconds")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    benchmark_path = Path(args.benchmark) if args.benchmark else script_dir / "benchmark.json"
    results_path = Path(args.results) if args.results else project_root / "results" / "results.json"
    results_path.parent.mkdir(parents=True, exist_ok=True)

    model_path = Path(args.model)
    if not model_path.is_absolute():
        model_path = (project_root / model_path).resolve()
    llama_cli = Path(args.llama_cli) if args.llama_cli else None

    items = load_benchmark(benchmark_path)
    results_list = []
    by_category: dict[str, list[bool]] = {}

    for i, item in enumerate(items):
        test_id = item.get("id", f"test_{i+1:03d}")
        category = item.get("category", "unknown")
        user_prompt = item.get("prompt", "")
        keywords = item.get("keywords", [])
        full_prompt = build_chat_prompt(user_prompt)

        print(f"  [{i+1}/{len(items)}] {test_id} ({category})...", flush=True)
        try:
            output = run_model(
                model_path,
                full_prompt,
                llama_cli_path=llama_cli,
                max_tokens=args.max_tokens,
                temp=args.temp,
                timeout_s=args.timeout,
            )
        except Exception as e:
            print(f"    Error: {e}", flush=True)
            output = ""
        score = score_text(output, keywords)
        p = passed(score)
        results_list.append({
            "id": test_id,
            "category": category,
            "prompt": user_prompt,
            "output": output[:2000],
            "keywords": keywords,
            "score": score,
            "passed": p,
        })
        by_category.setdefault(category, []).append(p)

    total = len(results_list)
    passed_count = sum(1 for r in results_list if r["passed"])
    pass_rate = passed_count / total if total else 0.0

    by_category_rates = {}
    for cat, passes in by_category.items():
        n = len(passes)
        by_category_rates[cat] = {
            "total": n,
            "passed": sum(passes),
            "pass_rate": sum(passes) / n if n else 0.0,
        }

    payload = {
        "model": str(model_path),
        "total_tests": total,
        "passed": passed_count,
        "pass_rate": round(pass_rate, 4),
        "by_category": by_category_rates,
        "results": results_list,
    }

    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print()
    print("Results summary")
    print("--------------")
    print(f"  Total tests:  {total}")
    print(f"  Passed:       {passed_count}")
    print(f"  Pass rate:    {pass_rate:.1%}")
    print("  By category:")
    for cat, stats in by_category_rates.items():
        print(f"    {cat}: {stats['pass_rate']:.1%} ({stats['passed']}/{stats['total']})")
    print(f"  Saved to:     {results_path}")


if __name__ == "__main__":
    main()
