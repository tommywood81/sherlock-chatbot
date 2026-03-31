"""
Generate docs/EVALUATION.md from results/results.json.

By default runs the full evaluation using llama-server (static build), saves
results/results.json, then generates the page. Use --page-only to skip
running and only regenerate the page from existing results.

Usage:
    python evaluation/generate_evaluation_page.py           # run eval (server) + generate page
    python evaluation/generate_evaluation_page.py --page-only   # only generate from results.json
    python evaluation/generate_evaluation_page.py --quick  # 2 prompts per category (~8 total)
"""
import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))
from scoring import load_benchmark, score_text, passed

PROJECT_ROOT = _script_dir.parent
RESULTS_PATH = PROJECT_ROOT / "results" / "results.json"
OUTPUT_PATH = PROJECT_ROOT / "docs" / "EVALUATION.md"
BENCHMARK_PATH = _script_dir / "benchmark.json"

# Static model and server (same as test_sherlock_model_10_questions)
GGUF_MODEL_PATH = PROJECT_ROOT / "models" / "llama32-1b-sherlock-q4.gguf"
SERVER_PORT = 15556
SERVER_WAIT_S = 120
MAX_NEW_TOKENS = 120

LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"
SYSTEM_MSG = (
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)

def _llama_server_path() -> Path:
    """Static build: build/bin/Release/llama-server.exe (Windows) or build/bin/llama-server (Linux)."""
    exe = "llama-server.exe" if sys.platform == "win32" else "llama-server"
    if sys.platform == "win32":
        return PROJECT_ROOT / "llama.cpp" / "build" / "bin" / "Release" / exe
    return PROJECT_ROOT / "llama.cpp" / "build" / "bin" / exe


def _build_chat_prompt(system: str, user: str) -> str:
    """Same format as training and run_full_evaluation."""
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n{system}\n{EOT}\n\n"
        f"{HDR_USER}\n{user}\n{EOT}\n\n"
        f"{HDR_ASSIST}\n"
    )


def _start_server(model_path: Path, server_exe: Path, port: int, max_tokens: int) -> subprocess.Popen:
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    cmd = [
        str(server_exe),
        "-m", str(model_path.resolve()),
        "--host", "127.0.0.1",
        "--port", str(port),
        "-c", "512",
        "-n", str(max_tokens),
    ]
    return subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        creationflags=creationflags,
    )


def _wait_for_server(port: int, timeout_s: float = SERVER_WAIT_S) -> None:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            _completion_request(port, "X", n_predict=2, timeout_s=90)
            return
        except (urllib.error.URLError, OSError, json.JSONDecodeError, KeyError, TypeError):
            pass
        time.sleep(2)
    raise RuntimeError(f"Server did not become ready within {timeout_s}s")


def _completion_request(port: int, prompt: str, n_predict: int = MAX_NEW_TOKENS, timeout_s: int = 120) -> str:
    url = f"http://127.0.0.1:{port}/completion"
    body = json.dumps({
        "prompt": prompt,
        "n_predict": n_predict,
        "temperature": 0.7,
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout_s) as r:
        data = json.loads(r.read().decode("utf-8"))
    content = data.get("content") or data.get("text")
    if content is None and "choices" in data and data["choices"]:
        content = data["choices"][0].get("text") or data["choices"][0].get("message", {}).get("content")
    if isinstance(content, list):
        content = content[0] if content else ""
    return (content or "").strip()


def _behaviour_summary(output: str, max_len: int = 90) -> str:
    """Short summary for the evaluation page."""
    text = output.strip().replace("\n", " ")
    if len(text) <= max_len:
        return text or "(no output)"
    return text[: max_len - 3].rsplit(" ", 1)[0] + "..."


def run_evaluation_via_server(
    *,
    benchmark_path: Path = BENCHMARK_PATH,
    results_path: Path = RESULTS_PATH,
    model_path: Path = GGUF_MODEL_PATH,
    max_tokens: int = MAX_NEW_TOKENS,
    quick: bool = False,
) -> dict:
    """Run full benchmark via llama-server (model loaded once), save results.json, return payload."""
    server_exe = _llama_server_path()
    if not server_exe.exists():
        raise FileNotFoundError(f"llama-server not found at {server_exe} (use static build: build/bin/Release/)")
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    items = load_benchmark(benchmark_path)
    if quick:
        cat_groups = {}
        for item in items:
            c = item.get("category", "unknown")
            cat_groups.setdefault(c, []).append(item)
        items = []
        for cat_items in cat_groups.values():
            items.extend(cat_items[:2])

    print("Starting llama-server (model loaded once)...", flush=True)
    proc = _start_server(model_path, server_exe, SERVER_PORT, max_tokens)
    try:
        _wait_for_server(SERVER_PORT)
        print("Server ready. Running benchmark...", flush=True)
        results_list = []
        by_category = {}
        timings = []

        for i, item in enumerate(items):
            test_id = item.get("id", f"test_{i+1:03d}")
            category = item.get("category", "unknown")
            user_prompt = item.get("prompt", "")
            keywords = item.get("keywords", [])
            full_prompt = _build_chat_prompt(SYSTEM_MSG, user_prompt)
            print(f"  [{i+1}/{len(items)}] {test_id} ({category})...", flush=True)
            t0 = time.perf_counter()
            try:
                output = _completion_request(SERVER_PORT, full_prompt, n_predict=max_tokens, timeout_s=120)
            except Exception as e:
                print(f"    Error: {e}", flush=True)
                output = ""
            elapsed = time.perf_counter() - t0
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

        total = len(results_list)
        output_count = sum(1 for r in results_list if r.get("has_output"))
        passed_count = sum(1 for r in results_list if r["passed"])
        pass_rate = passed_count / total if total else 0.0
        output_rate = output_count / total if total else 0.0
        avg_time = sum(timings) / len(timings) if timings else 0.0
        by_category_rates = {}
        for cat, vals in by_category.items():
            n = len(vals)
            passed_n = sum(1 for p, _ in vals if p)
            by_category_rates[cat] = {"total": n, "passed": passed_n, "pass_rate": passed_n / n if n else 0.0}

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
        results_path.parent.mkdir(parents=True, exist_ok=True)
        with open(results_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        print(f"Saved to {results_path}", flush=True)
        return payload
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


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
    parser = argparse.ArgumentParser(description="Run evaluation via llama-server and/or generate EVALUATION.md")
    parser.add_argument("--page-only", action="store_true", help="Only generate page from existing results.json")
    parser.add_argument("--quick", "-q", action="store_true", help="Run 2 prompts per category (~8 total)")
    parser.add_argument("--max-tokens", "-n", type=int, default=MAX_NEW_TOKENS, help="Max tokens per response")
    args = parser.parse_args()

    data = None
    if not args.page_only and GGUF_MODEL_PATH.exists() and _llama_server_path().exists():
        data = run_evaluation_via_server(
            max_tokens=args.max_tokens,
            quick=args.quick,
        )
    if data is None:
        data = load_results()
    if not data or not data.get("results"):
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        placeholder = (
            "# Sherlock Holmes Model Evaluation\n\n"
            "**Pipeline:**\n\n"
            "`Base Model → LoRA Adapters → Merge → GGUF → Q4 Quantization → CPU Inference`\n\n"
            "---\n\n"
            "**To populate this page:**\n\n"
            "Run evaluation (llama-server, static build) and generate this page:\n\n"
            "   ```\n"
            "   python evaluation/generate_evaluation_page.py\n"
            "   ```\n\n"
            "Use `--quick` for ~8 prompts. Use `--page-only` to regenerate the page from existing results/results.json.\n"
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
    lines.append("*Generated from evaluation results. Run `python evaluation/generate_evaluation_page.py` to run eval (llama-server) and refresh.*")
    lines.append("")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
