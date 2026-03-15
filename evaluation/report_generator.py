"""
Generate a markdown evaluation report from results.json and pairwise_results.json.

Usage:
    python evaluation/report_generator.py

Reads results/results.json and results/pairwise_results.json (if present).
Writes report/evaluation_report.md. Uses only stdlib.
"""
import json
from pathlib import Path


def load_json(path: Path) -> dict | None:
    """Load JSON file; return None if missing or invalid."""
    if not path.exists():
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    results_dir = project_root / "results"
    report_dir = project_root / "report"
    report_dir.mkdir(parents=True, exist_ok=True)

    results_path = results_dir / "results.json"
    pairwise_path = results_dir / "pairwise_results.json"
    report_path = report_dir / "evaluation_report.md"

    results = load_json(results_path)
    pairwise = load_json(pairwise_path)

    lines = [
        "# Sherlock Model Evaluation Report",
        "",
        "## 1. Project overview",
        "",
        "This report summarises the evaluation of a fine-tuned Llama 3.2 1B model in the style of Sherlock Holmes. The model is quantised to GGUF and run locally via llama.cpp. Evaluation uses a benchmark of prompts across memorisation, generalisation, capability retention, and style, with keyword-based scoring.",
        "",
        "## 2. Model configuration",
        "",
        "- **Base model:** Llama 3.2 1B Instruct",
        "- **Fine-tuning:** QLoRA on Sherlock-style dialogue and deduction data",
        "- **Inference:** GGUF (Q4_K_M or F16) via llama.cpp",
        "- **Prompt format:** Llama chat template (system / user / assistant)",
        "",
        "## 3. Benchmark description",
        "",
        "The benchmark (`evaluation/benchmark.json`) contains prompts in four categories:",
        "",
        "| Category | Description |",
        "| -------- | ----------- |",
        "| Memorisation | Facts about Sherlock Holmes (identity, method, Baker Street, etc.) |",
        "| Generalisation | New reasoning questions not in training data (clues, deduction) |",
        "| Capability retention | General knowledge (to ensure base capabilities remain) |",
        "| Style | Sherlock tone and Victorian reasoning phrasing |",
        "",
        "Each item is scored by counting how many of its `keywords` appear in the model output. A test **passes** if at least one keyword is present.",
        "",
        "---",
        "",
        "## 4. Evaluation results",
        "",
    ]

    if results:
        model = results.get("model", "—")
        total = results.get("total_tests", 0)
        passed_count = results.get("passed", 0)
        rate = results.get("pass_rate", 0.0)
        by_cat = results.get("by_category", {})

        lines.extend([
            f"- **Model:** `{model}`",
            f"- **Total tests:** {total}",
            f"- **Passed:** {passed_count}",
            f"- **Pass rate:** {rate:.1%}",
            "",
            "### Pass rate by category",
            "",
            "| Category | Pass Rate | Passed / Total |",
            "| -------- | --------- | -------------- |",
        ])
        for cat, stats in sorted(by_cat.items()):
            pr = stats.get("pass_rate", 0) * 100
            p = stats.get("passed", 0)
            t = stats.get("total", 0)
            lines.append(f"| {cat} | {pr:.0f}% | {p} / {t} |")
        lines.extend(["", ""])
    else:
        lines.extend([
            "No single-model results found. Run:",
            "`python evaluation/run_eval.py --model path/to/model.gguf`",
            "",
        ])

    lines.extend([
        "---",
        "",
        "## 5. Pairwise comparison (base vs fine-tuned)",
        "",
    ])

    if pairwise:
        base = pairwise.get("base_model", "—")
        fine = pairwise.get("fine_model", "—")
        total = pairwise.get("total", 0)
        fine_wins = pairwise.get("fine_wins", 0)
        base_wins = pairwise.get("base_wins", 0)
        ties = pairwise.get("ties", 0)
        win_rate = pairwise.get("win_rate_fine", 0.0)
        avg_diff = pairwise.get("avg_score_diff", 0.0)

        lines.extend([
            "| Metric | Base model | Fine-tuned model |",
            "| ------ | ---------- | ---------------- |",
            f"| Model path | `{base}` | `{fine}` |",
            f"| Wins | {base_wins} | {fine_wins} |",
            f"| Ties | | {ties} |",
            f"| Win rate (fine-tuned) | | {win_rate:.1%} |",
            f"| Average score difference (fine − base) | | {avg_diff:+.2f} |",
            "",
            "### Example outputs",
            "",
        ])
        results_list = pairwise.get("results", [])[:3]
        for r in results_list:
            pid = r.get("id", "—")
            prompt = r.get("prompt", "")[:80] + ("..." if len(r.get("prompt", "")) > 80 else "")
            base_out = (r.get("base_output") or "")[:200].replace("\n", " ")
            fine_out = (r.get("fine_output") or "")[:200].replace("\n", " ")
            lines.extend([
                f"**{pid}** — *{prompt}*",
                "",
                "- **Base:** " + (base_out or "(empty)"),
                "- **Fine-tuned:** " + (fine_out or "(empty)"),
                "",
            ])
    else:
        lines.extend([
            "No pairwise results found. Run:",
            "`python evaluation/pairwise_eval.py --base base.gguf --fine fine_tuned.gguf`",
            "",
        ])

    lines.append("---")
    lines.append("")
    lines.append("*Report generated by `evaluation/report_generator.py`*")

    report_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Report written to {report_path}")


if __name__ == "__main__":
    main()
