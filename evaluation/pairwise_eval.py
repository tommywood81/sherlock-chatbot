"""
Compare base and fine-tuned GGUF models on the benchmark.

Usage:
    python evaluation/pairwise_eval.py --base path/to/base.gguf --fine path/to/fine_tuned.gguf

Uses only stdlib. Writes results/pairwise_results.json.
"""
import argparse
import json
import sys
from pathlib import Path

_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))
from run_eval import build_chat_prompt, run_model
from scoring import load_benchmark, score_text


def main() -> None:
    parser = argparse.ArgumentParser(description="Pairwise evaluation: base vs fine-tuned model")
    parser.add_argument("--base", "-b", required=True, help="Path to base GGUF model")
    parser.add_argument("--fine", "-f", required=True, help="Path to fine-tuned GGUF model")
    parser.add_argument("--benchmark", default=None, help="Path to benchmark.json")
    parser.add_argument("--results", "-o", default=None, help="Path to pairwise_results.json")
    parser.add_argument("--llama-cli", default=None, help="Path to llama-cli executable")
    parser.add_argument("--max-tokens", "-n", type=int, default=120)
    parser.add_argument("--temp", type=float, default=0.4)
    parser.add_argument("--timeout", type=int, default=300)
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    benchmark_path = Path(args.benchmark) if args.benchmark else script_dir / "benchmark.json"
    results_path = Path(args.results) if args.results else project_root / "results" / "pairwise_results.json"
    results_path.parent.mkdir(parents=True, exist_ok=True)

    base_path = Path(args.base)
    fine_path = Path(args.fine)
    if not base_path.is_absolute():
        base_path = (project_root / base_path).resolve()
    if not fine_path.is_absolute():
        fine_path = (project_root / fine_path).resolve()
    llama_cli = Path(args.llama_cli) if args.llama_cli else None

    items = load_benchmark(benchmark_path)
    results_list = []
    fine_wins = base_wins = ties = 0
    score_diffs: list[float] = []

    for i, item in enumerate(items):
        test_id = item.get("id", f"test_{i+1:03d}")
        category = item.get("category", "unknown")
        user_prompt = item.get("prompt", "")
        keywords = item.get("keywords", [])
        full_prompt = build_chat_prompt(user_prompt)

        print(f"  [{i+1}/{len(items)}] {test_id} base...", flush=True)
        try:
            base_out = run_model(
                base_path, full_prompt,
                llama_cli_path=llama_cli, max_tokens=args.max_tokens,
                temp=args.temp, timeout_s=args.timeout,
            )
        except Exception as e:
            print(f"    Base error: {e}", flush=True)
            base_out = ""
        base_score = score_text(base_out, keywords)

        print(f"  [{i+1}/{len(items)}] {test_id} fine...", flush=True)
        try:
            fine_out = run_model(
                fine_path, full_prompt,
                llama_cli_path=llama_cli, max_tokens=args.max_tokens,
                temp=args.temp, timeout_s=args.timeout,
            )
        except Exception as e:
            print(f"    Fine error: {e}", flush=True)
            fine_out = ""
        fine_score = score_text(fine_out, keywords)

        diff = fine_score - base_score
        score_diffs.append(diff)
        if fine_score > base_score:
            winner = "fine"
            fine_wins += 1
        elif base_score > fine_score:
            winner = "base"
            base_wins += 1
        else:
            winner = "tie"
            ties += 1

        results_list.append({
            "id": test_id,
            "category": category,
            "prompt": user_prompt,
            "base_output": base_out[:1500],
            "fine_output": fine_out[:1500],
            "base_score": base_score,
            "fine_score": fine_score,
            "winner": winner,
        })

    total = len(results_list)
    win_rate_fine = fine_wins / total if total else 0.0
    avg_diff = sum(score_diffs) / total if total else 0.0

    payload = {
        "base_model": str(base_path),
        "fine_model": str(fine_path),
        "total": total,
        "fine_wins": fine_wins,
        "base_wins": base_wins,
        "ties": ties,
        "win_rate_fine": round(win_rate_fine, 4),
        "avg_score_diff": round(avg_diff, 4),
        "results": results_list,
    }

    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print()
    print("Pairwise summary")
    print("---------------")
    print(f"  Fine-tuned wins: {fine_wins}")
    print(f"  Base wins:       {base_wins}")
    print(f"  Ties:            {ties}")
    print(f"  Win rate (fine): {win_rate_fine:.1%}")
    print(f"  Avg score diff:  {avg_diff:+.2f} (fine - base)")
    print(f"  Saved to:        {results_path}")


if __name__ == "__main__":
    main()
