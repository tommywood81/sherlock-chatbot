#!/usr/bin/env python3
"""
Dataset overfitting analysis tool.

Goal: detect repeated phrasing and low diversity in responses BEFORE training.

Usage (from project root):
    python scripts/analyze_overfitting.py

Input: data/processed/train.jsonl
Expected schema (per line, JSON):
    {
      "prompt": "...",   # optional
      "response": "..."  # preferred
    }

If only {"text": "<llama chat template>"} is present, the script will try to
extract the assistant segment from the Llama-style chat template.
"""

from __future__ import annotations

import json
import math
import re
import statistics
from collections import Counter
from pathlib import Path
from typing import Iterable, List, Tuple


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "processed" / "train.jsonl"


def _extract_assistant_from_chat(text: str) -> str | None:
    """
    Best-effort extraction of the assistant segment from a Llama chat template.
    Looks for <|start_header_id|>assistant ... <|eot_id|>.
    """
    hdr_assist = "<|start_header_id|>assistant<|end_header_id|>"
    eot = "<|eot_id|>"
    if hdr_assist not in text:
        return None
    after = text.split(hdr_assist, 1)[1]
    if eot not in after:
        return after.strip() or None
    body = after.split(eot, 1)[0]
    return body.strip() or None


def load_responses(path: Path) -> List[str]:
    """Load all responses from JSONL."""
    if not path.exists():
        raise SystemExit(f"Input file not found: {path}")
    responses: List[str] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict):
                if "response" in obj and isinstance(obj["response"], str):
                    resp = obj["response"].strip()
                elif "text" in obj and isinstance(obj["text"], str):
                    resp = _extract_assistant_from_chat(obj["text"]) or ""
                else:
                    resp = ""
                if resp:
                    responses.append(resp)
    if not responses:
        raise SystemExit("No responses found in dataset (expected 'response' or 'text' fields).")
    return responses


def _tokenize(text: str) -> List[str]:
    """Simple whitespace tokenization; lowercased for n-gram counts."""
    return text.strip().split()


def _ngram_prefix(tokens: List[str], n: int) -> str:
    if not tokens:
        return ""
    return " ".join(tokens[: min(n, len(tokens))]).lower()


def analyze_start_ngrams(responses: List[str]) -> None:
    """First token analysis and dominance check."""
    print("== START N-GRAM ANALYSIS ==")
    n_values = [1, 2, 3, 5]
    total = len(responses)
    warnings: List[str] = []

    for n in n_values:
        counter: Counter[str] = Counter()
        for resp in responses:
            tokens = _tokenize(resp)
            if not tokens:
                continue
            key = _ngram_prefix(tokens, n)
            if key:
                counter[key] += 1
        if not counter:
            continue
        print(f"\nTop 10 starting {n}-grams:")
        for phrase, cnt in counter.most_common(10):
            frac = cnt / total
            print(f"  {phrase!r:<60} {cnt:6d} ({frac:5.1%})")
        most_common, max_freq = counter.most_common(1)[0]
        dominance = max_freq / total
        print(f"Max dominance for {n}-grams: {dominance:.3f} (phrase={most_common!r})")
        if dominance > 0.15:
            warnings.append(
                f"High repetition detected in starting {n}-grams "
                f"({dominance:.1%} start with {most_common!r})"
            )

    if warnings:
        print("\n[WARNINGS - N-GRAM DOMINANCE]")
        for w in warnings:
            print(f"- {w}")
    else:
        print("\nNo high-dominance starting n-grams detected (<= 15%).")


def analyze_openings(responses: List[str], openings: Iterable[str]) -> None:
    """Check how many responses start with any of the known OPENINGS."""
    openings_norm = [o.strip().lower() for o in openings if o.strip()]
    if not openings_norm:
        print("\n== OPENING ANALYSIS ==\nNo openings configured.")
        return
    count = 0
    total = len(responses)
    for resp in responses:
        lower = resp.strip().lower()
        if any(lower.startswith(o) for o in openings_norm):
            count += 1
    frac = count / total if total else 0.0
    print("\n== OPENING ANALYSIS ==")
    print(f"Responses starting with a known opening: {count}/{total} ({frac:5.1%})")
    if frac > 0.35:
        print("WARNING: Too many responses start with openings (> 35%).")


def analyze_unique_start_ratio(responses: List[str]) -> None:
    """Compute unique first-3-token start ratio."""
    total = len(responses)
    starts: set[str] = set()
    for resp in responses:
        key = _ngram_prefix(_tokenize(resp), 3)
        if key:
            starts.add(key)
    ratio = len(starts) / total if total else 0.0
    print("\n== UNIQUE START RATIO ==")
    print(f"Unique first-3-token sequences: {len(starts)}/{total} ({ratio:5.1%})")
    if ratio < 0.30:
        print("WARNING: Low diversity in response starts (< 30%).")


def analyze_length_distribution(responses: List[str]) -> None:
    """Length statistics and uniformity check."""
    lengths = [len(_tokenize(r)) for r in responses]
    if not lengths:
        print("\n== LENGTH ANALYSIS ==\nNo responses to analyze.")
        return
    avg = statistics.fmean(lengths)
    min_len = min(lengths)
    max_len = max(lengths)
    std = statistics.pstdev(lengths)
    print("\n== LENGTH ANALYSIS ==")
    print(f"Average length (tokens): {avg:.1f}")
    print(f"Min / Max length:        {min_len} / {max_len}")
    print(f"Std deviation:            {std:.1f}")
    # Heuristic: very low std compared to mean suggests uniformity
    if avg > 0 and std / max(avg, 1.0) < 0.25:
        print("WARNING: Responses may be too uniform in length (low std/mean).")


def analyze_structure(responses: List[str]) -> None:
    """Simple structural heuristics."""
    print("\n== STRUCTURE ANALYSIS ==")
    starts_with_number = 0
    contains_list_newlines = 0
    similar_endings_counter: Counter[str] = Counter()

    for resp in responses:
        stripped = resp.lstrip()
        if re.match(r"^\d+\.", stripped):
            starts_with_number += 1
        if "\n1." in resp or "\n- " in resp:
            contains_list_newlines += 1
        tokens = _tokenize(resp)
        if len(tokens) >= 3:
            ending = " ".join(tokens[-3:]).lower()
            similar_endings_counter[ending] += 1

    total = len(responses)
    print(f"Responses starting with a number (e.g. '1.'): {starts_with_number}/{total}")
    print(f"Responses containing newline lists:          {contains_list_newlines}/{total}")

    if similar_endings_counter:
        print("\nTop 5 response endings (last 3 tokens):")
        for ending, cnt in similar_endings_counter.most_common(5):
            frac = cnt / total
            print(f"  {ending!r:<40} {cnt:6d} ({frac:5.1%})")


def analyze_vocab_diversity(responses: List[str]) -> None:
    """Vocabulary diversity: unique_words / total_words."""
    print("\n== VOCABULARY DIVERSITY ==")
    words: List[str] = []
    for r in responses:
        # Basic word normalization: lowercase and strip punctuation at edges
        for w in r.split():
            w_norm = w.strip(".,;:!?\"'()[]{}").lower()
            if w_norm:
                words.append(w_norm)
    total = len(words)
    if total == 0:
        print("No words found.")
        return
    unique = len(set(words))
    ratio = unique / total
    print(f"Unique words: {unique}")
    print(f"Total words:  {total}")
    print(f"Ratio:        {ratio:5.3f}")
    if ratio < 0.10:
        print("WARNING: Low vocabulary diversity (< 0.10).")


def main() -> None:
    print(f"Loading responses from {DATA_PATH} ...")
    responses = load_responses(DATA_PATH)
    total = len(responses)
    print(f"Loaded {total} responses.\n")

    # We do not import OPENINGS from training to keep this script standalone.
    # The openings list here should mirror training/collect_pairs.py.
    openings_local = [
        "Observe the detail before us:",
        "Consider what lies in plain sight:",
        "Note this small but telling point:",
        "Examine the facts carefully:",
        "A curious detail presents itself:",
        "It is worth noting that",
        "We begin with a simple observation:",
        "Let us look at the evidence:",
        "The situation suggests something interesting:",
        "One detail stands out immediately:",
        "What do we make of this?",
        "How are we to interpret this?",
        "What conclusion follows from this?",
        "What does this imply?",
        "How does this detail guide us?",
        "What can be inferred here?",
        "What does the evidence suggest?",
        "What are we to conclude from this?",
        "What does this reveal?",
        "What follows from such a detail?",
        "The answer lies in a small observation:",
        "The key lies in the following detail:",
        "The explanation begins here:",
        "The matter becomes clearer when we note:",
        "The truth emerges when we consider:",
        "The evidence points us in a clear direction:",
        "The facts lead us somewhere definite:",
        "The clue directs us toward a conclusion:",
        "The reasoning begins with this:",
        "The conclusion rests on a simple point:",
        "At first glance, it seems trivial, yet",
        "Though it appears insignificant,",
        "It may seem unimportant, but",
        "What appears ordinary is not so:",
        "A seemingly minor detail reveals much:",
        "At first, nothing seems amiss, yet",
        "There is more here than meets the eye:",
        "What seems obvious deserves scrutiny:",
        "A closer look changes everything:",
        "Appearances, in this case, deceive:",
        "Let us proceed step by step:",
        "Let us reason this out:",
        "Let us examine the sequence of events:",
        "Let us consider the implications:",
        "Let us follow the logic carefully:",
        "Let us reconstruct what happened:",
        "Let us analyse the situation:",
        "Let us break this down:",
        "Let us trace the reasoning:",
        "Let us consider the facts in order:",
        "It is evident that",
        "It becomes clear that",
        "One may reasonably conclude that",
        "It follows logically that",
        "We may infer that",
        "The inference is straightforward:",
        "The conclusion is unavoidable:",
        "The reasoning leads us to",
        "There can be little doubt that",
        "All signs point to the fact that",
        "A careful observer would notice:",
        "Any attentive mind would see:",
        "To the trained eye, it is clear:",
        "An experienced observer would conclude:",
        "One accustomed to such matters would note:",
        "To one who examines closely,",
        "The attentive observer will see:",
        "To the discerning eye,",
        "A practiced mind would recognise:",
        "One who looks closely will find:",
        "We must not overlook this detail:",
        "This detail must not be ignored:",
        "It would be a mistake to ignore:",
        "We should pay close attention to this:",
        "This point is of particular importance:",
        "Here lies the crucial detail:",
        "This is where the answer begins:",
        "This is the turning point:",
        "This is the decisive clue:",
        "Everything hinges on this:",
    ]

    analyze_start_ngrams(responses)
    analyze_openings(responses, openings_local)
    analyze_unique_start_ratio(responses)
    analyze_length_distribution(responses)
    analyze_structure(responses)
    analyze_vocab_diversity(responses)

    # Final summary / verdict (very coarse, based on previous warnings that print inline).
    print("\n==============================")
    print("OVERFITTING RISK REPORT")
    print("==============================")
    print("See sections above for:")
    print("- Top repeated starts and dominance ratios")
    print("- Opening usage percentage")
    print("- Unique start ratio")
    print("- Length distribution")
    print("- Structural patterns (lists, numbered starts, common endings)")
    print("- Vocabulary diversity\n")
    print("Heuristic verdict (manual):")
    print("  LOW RISK    – no strong dominance in starts, high unique-start ratio, good vocab diversity")
    print("  MEDIUM RISK – some repeated openings or moderate dominance")
    print("  HIGH RISK   – very high dominance in starts, low unique-start ratio, very low vocab diversity")
    print("\nInterpret the warnings above to choose an appropriate verdict.")


if __name__ == "__main__":
    main()

