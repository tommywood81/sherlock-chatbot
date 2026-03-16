"""
Lightweight runtime evaluation and scoring utilities.

This module keeps per-session score history in memory and exposes helpers to
aggregate scores for the frontend evaluation dashboard.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, Literal, Tuple

from .sessions import ScoreEntry, TestType


def simple_similarity(a: str, b: str) -> float:
  """
  Very lightweight string similarity: token overlap Jaccard score.
  Returns a value in [0, 1].
  """
  a_tokens = {t.lower() for t in a.split() if t}
  b_tokens = {t.lower() for t in b.split() if t}
  if not a_tokens or not b_tokens:
    return 0.0
  intersection = len(a_tokens & b_tokens)
  union = len(a_tokens | b_tokens)
  return intersection / union if union else 0.0


def score_answer(expected: str, answer: str) -> float:
  """
  Compute a numeric score for a model answer compared to an expected string.
  For now this is just Jaccard token overlap scaled to [0, 1].
  """
  return simple_similarity(expected, answer)


def aggregate_scores(entries: Iterable[ScoreEntry]) -> Dict[str, object]:
  """
  Aggregate scores across sessions for the evaluation dashboard.

  Returns a structure compatible with the existing EvaluationResult type on the
  frontend.
  """
  total = 0
  passed = 0
  by_category: Dict[str, Dict[str, float]] = defaultdict(lambda: {"total": 0, "passed": 0})
  results = []

  for e in entries:
    total += 1
    is_pass = e.score >= 0.7
    if is_pass:
      passed += 1
    cat_stats = by_category[e.test_type]
    cat_stats["total"] += 1
    if is_pass:
      cat_stats["passed"] += 1
    results.append(
      {
        "id": e.question_id,
        "category": e.test_type,
        "prompt": e.expected,
        "output": e.answer,
        "score": e.score,
        "passed": is_pass,
      }
    )

  for cat, stats in by_category.items():
    t = stats["total"] or 1
    stats["pass_rate"] = stats["passed"] / t

  pass_rate = passed / total if total else 0.0

  return {
    "total_tests": total,
    "passed": passed,
    "pass_rate": pass_rate,
    "by_category": by_category,
    "results": results,
  }

