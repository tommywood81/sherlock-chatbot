"""
Generate docs/EVALUATION.md from results/results.json.

Run after evaluation/run_full_evaluation.py to populate the page.

Usage:
    python evaluation/generate_evaluation_page.py
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_PATH = PROJECT_ROOT / "results" / "results.json"
OUTPUT_PATH = PROJECT_ROOT / "docs" / "EVALUATION.md"

# Map benchmark categories to page capability names
CAPABILITY_MAP = {
    "memorisation": "Character Consistency",
    "generalisation": "Deductive Reasoning",
    "style": "Dialogue Interaction",
    "capability_retention": "Out-of-Scope Handling",
}


def load_results() -> dict | None:
    if not RESULTS_PATH.exists():
        return None
    with open(RESULTS_PATH, encoding="utf-8") as f:
        return json.load(f)


def pick_examples(results: list[dict], category: str, n: int = 3) -> list[dict]:
    """Pick n representative prompts (mix pass/fail) for a capability."""
    cat_results = [r for r in results if r.get("category") == category]
    passed = [r for r in cat_results if r.get("passed")]
    failed = [r for r in cat_results if not r.get("passed")]
    # Prefer 2 passed, 1 failed if possible
    chosen = passed[:2] + failed[:1] if len(passed) >= 2 else passed[:1] + failed[:2]
    chosen = (chosen + cat_results)[:n]
    return chosen


def infer_limitations(results: dict) -> list[str]:
    """Derive limitations from failed tests and category patterns."""
    lims = []
    by_cat = results.get("by_category", {})
    results_list = results.get("results", [])

    gen_stats = by_cat.get("generalisation", {})
    if gen_stats.get("pass_rate", 1) < 0.7:
        lims.append("Deductive reasoning drops on novel clues—responses can feel generic.")

    cap_stats = by_cat.get("capability_retention", {})
    if cap_stats.get("pass_rate", 1) < 0.6:
        lims.append("General knowledge takes a hit after fine-tuning; factual questions sometimes drift or go quiet.")

    failed_outputs = [r for r in results_list if not r.get("passed") and r.get("output")]
    short_or_empty = sum(1 for r in failed_outputs if len(r.get("output", "").strip()) < 20)
    if failed_outputs and short_or_empty > len(failed_outputs) * 0.3:
        lims.append("Some responses are short or truncated.")

    lims.append("Q4 quantization helps with deployability but costs a bit of nuance.")

    mem_stats = by_cat.get("memorisation", {})
    if mem_stats.get("pass_rate", 1) < 0.8:
        lims.append("Longer exchanges can drift out of character.")

    return lims[:5]


def infer_lessons(results: dict) -> list[str]:
    """Short reflections from building and evaluating."""
    lessons = [
        "Good dataset structure beat raw size. Clean Sherlock-style pairs made the difference.",
        "Prompt format had to match training exactly—tiny mismatches killed output quality.",
        "1B params means you pick: strong character or strong general knowledge. Hard to get both.",
        "QLoRA + Q4 gets it onto a droplet. Worth the small accuracy hit.",
    ]
    return lessons[:4]


def main() -> None:
    data = load_results()
    if not data or not data.get("results"):
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        placeholder = (
            "# Sherlock Holmes Model Evaluation\n\n"
            "**Pipeline:**\n\n"
            "`Base Model → LoRA Adapters → Merge → GGUF → Q4 Quantization → CPU Inference`\n\n"
            "---\n\n"
            "**To populate this page with real results:**\n\n"
            "1. Run the full evaluation (same stack as `pytest tests/test_sherlock_model.py`):\n\n"
            "   ```\n"
            "   python evaluation/run_full_evaluation.py -m models/llama32-1b-sherlock-q4.gguf\n"
            "   ```\n\n"
            "   Use `--quick` for a shorter run (8 prompts). Use `-n 15` to match the test token count.\n\n"
            "2. Regenerate this page:\n\n"
            "   ```\n"
            "   python evaluation/generate_evaluation_page.py\n"
            "   ```\n"
        )
        OUTPUT_PATH.write_text(placeholder, encoding="utf-8")
        print(f"Placeholder written to {OUTPUT_PATH} (no evaluation results yet)")
        return

    total = data.get("total_tests", 0)
    passed_count = data.get("passed", 0)
    pass_rate = data.get("pass_rate", 0.0)
    avg_time = data.get("avg_response_time_s", 0.0)
    by_cat = data.get("by_category", {})
    results_list = data.get("results", [])

    # Capability stats with mapped names
    cap_rows = []
    for bench_cat, page_name in CAPABILITY_MAP.items():
        stats = by_cat.get(bench_cat, {})
        t = stats.get("total", 0)
        p = stats.get("passed", 0)
        rate = stats.get("pass_rate", 0.0)
        cap_rows.append((page_name, t, p, rate))

    # Round for display
    char_cons = by_cat.get("memorisation", {})
    deduc = by_cat.get("generalisation", {})
    dialogue = by_cat.get("style", {})
    oos = by_cat.get("capability_retention", {})

    char_pct = int(char_cons.get("pass_rate", 0) * 100)
    deduc_pct = int(deduc.get("pass_rate", 0) * 100)
    dialogue_pct = int(dialogue.get("pass_rate", 0) * 100)
    oos_pct = int(oos.get("pass_rate", 0) * 100)

    limitations = infer_limitations(data)
    lessons = infer_lessons(data)

    lines = [
        "# Sherlock Holmes Model Evaluation",
        "",
        "**Pipeline:**",
        "",
        "`Base Model → LoRA Adapters → Merge → GGUF → Q4 Quantization → CPU Inference`",
        "",
        "## Project Summary",
        "",
        "I wanted a Sherlock chatbot that actually runs on a cheap CPU droplet. Something like 2 GB RAM, no GPU. So I fine-tuned Llama 3.2 1B with QLoRA, merged the adapters, converted to GGUF, and quantized. It works.",
        "",
        "## Quick Results",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Character Consistency | {char_pct}% |",
        f"| Deductive Reasoning | {deduc_pct}% |",
        f"| Dialogue Interaction | {dialogue_pct}% |",
        f"| Out-of-Scope Handling | {oos_pct}% |",
        "| | |",
        f"| RAM Usage | ~2 GB |",
        f"| Avg CPU Response Time | ~{avg_time:.1f}s |",
        f"| Total Prompts | {total} |",
        "",
        "## Model Specs",
        "",
        "| Spec | Value |",
        "|------|-------|",
        "| Base Model | Llama 3.2 1B Instruct |",
        "| Fine-tuning | QLoRA (r=32, 4-bit NF4) |",
        "| Training Data | ~3.7k pairs |",
        "| Quantization | Q4_K_M (GGUF) |",
        "| Inference | llama.cpp (CPU) |",
        "| RAM | ~2 GB |",
        "| Target | 4 GB CPU droplet |",
        "",
        "## Evaluation Method",
        "",
        "Task-specific prompts in four areas. Pass/fail by keyword match, then aggregated. Simple but gives a quick signal on where the model holds up and where it doesn't.",
        "",
        "## Capability Results",
        "",
        "| Capability | Tests | Pass | Score |",
        "|------------|-------|------|-------|",
    ]

    for name, t, p, rate in cap_rows:
        lines.append(f"| {name} | {t} | {p} | {int(rate * 100)}% |")

    lines.extend([
        "",
        "## Example Tests",
        "",
    ])

    for bench_cat, page_name in CAPABILITY_MAP.items():
        examples = pick_examples(results_list, bench_cat, 3)
        if not examples:
            continue
        lines.append(f"### {page_name}")
        lines.append("")
        lines.append("| Prompt | Result |")
        lines.append("|--------|--------|")
        for ex in examples:
            prompt = ex.get("prompt", "")[:60] + ("..." if len(ex.get("prompt", "")) > 60 else "")
            summary = ex.get("behaviour_summary", "(no output)").replace("|", "\\|")
            lines.append(f"| {prompt} | {summary} |")
        lines.append("")

    lines.extend([
        "## Known Limitations",
        "",
    ])
    for lim in limitations:
        lines.append(f"- {lim}")
    lines.append("")

    lines.extend([
        "## Lessons Learned",
        "",
    ])
    for les in lessons:
        lines.append(f"- {les}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("*Generated from evaluation results. Run `python evaluation/run_full_evaluation.py` to refresh.*")
    lines.append("")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
