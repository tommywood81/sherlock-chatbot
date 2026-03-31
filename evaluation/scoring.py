"""
Lightweight scoring for evaluation: keyword matching against model output.

Uses only the Python standard library. A test passes if at least one
keyword appears in the output (configurable).
"""
import json
from pathlib import Path
from typing import Any


def score_text(output: str, keywords: list[str], case_sensitive: bool = False) -> int:
    """
    Count how many of the given keywords appear in the output.

    Args:
        output: Generated text to score.
        keywords: List of keywords that indicate a relevant response.
        case_sensitive: If False, comparison is case-insensitive.

    Returns:
        Number of distinct keywords found in output (0 to len(keywords)).
    """
    if not output or not keywords:
        return 0
    text = output if case_sensitive else output.lower()
    seen = set()
    for kw in keywords:
        k = kw if case_sensitive else kw.lower()
        if k in text and k not in seen:
            seen.add(k)
    return len(seen)


def passed(score: int, min_keywords: int = 1) -> bool:
    """Return True if score meets the pass threshold (default: at least one keyword)."""
    return score >= min_keywords


def load_benchmark(benchmark_path: Path) -> list[dict[str, Any]]:
    """Load benchmark JSON; return list of items with id, category, prompt, keywords."""
    with open(benchmark_path, encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else data.get("items", data.get("benchmark", []))
    return items
