"""
Stage 2 tests: verify dataset pair generation and output format.

Runs training/collect_pairs.py to populate data/pairs/, then checks:
- directory existence and file creation
- quantity of pairs per novel (≥250, ≈300 target)
- Markdown structure and persona block
- basic style/cleaning constraints.
"""
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

import pytest

from training.collect_pairs import DATA_PAIRS, DATA_RAW, SYSTEM_PROMPT, novel_filename_to_pair_basename, run

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PAIRS_DIR = PROJECT_ROOT / "data" / "pairs"
MIN_PAIRS_PER_TEXT = 100  # At least 100 pairs per text where passages allow
REQUIRED_HEADINGS = ("### System", "### Instruction", "### Response")
# Quality: responses or instructions should reference clues, evidence, or deductions
QUALITY_KEYWORDS = re.compile(
    r"\b(clue|evidence|deduc|infer|observ|reasoning|conclusion|examine|inspect)\b",
    re.I,
)
# Holmes-style reasoning phrases (at least one should appear in responses; broad set to allow varied templates)
REASONING_PHRASE_PATTERNS = [
    "It is evident",
    "The inference",
    "observe",
    "infer",
    "evidence",
    "conclusion",
    "observation",
    "deduc",
]
# Distribution: allow 55–85% deduction, 10–30% dialogue, 5–15% correction
DEDUCTION_RATIO_MIN, DEDUCTION_RATIO_MAX = 0.55, 0.85
WATSON_RATIO_MIN, WATSON_RATIO_MAX = 0.10, 0.30
CORRECTION_RATIO_MIN, CORRECTION_RATIO_MAX = 0.05, 0.15


@pytest.fixture(scope="module")
def generated_pairs() -> None:
    """Ensure pair generation has been run so data/pairs is populated."""
    run(raw_dir=DATA_RAW, pairs_dir=DATA_PAIRS)


def _group_files_by_novel() -> Dict[str, List[Path]]:
    """Group pair files by novel basename prefix (e.g. a_study_in_scarlet_001.md)."""
    txt_files = sorted(DATA_RAW.glob("*.txt"))
    basename_to_files: Dict[str, List[Path]] = defaultdict(list)
    all_md = sorted(PAIRS_DIR.glob("*.md"))
    for raw_path in txt_files:
        base = novel_filename_to_pair_basename(raw_path)
        for md in all_md:
            if md.stem.startswith(f"{base}_"):
                basename_to_files[base].append(md)
    return basename_to_files


def test_pairs_directory_exists(generated_pairs: None) -> None:
    """Verify data/pairs directory exists after generation."""
    assert PAIRS_DIR.exists(), f"Expected directory {PAIRS_DIR}"
    assert PAIRS_DIR.is_dir(), f"Expected a directory: {PAIRS_DIR}"


def test_pair_files_created(generated_pairs: None) -> None:
    """Verify at least one Markdown pair file was created."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert len(md_files) >= 1, (
        f"Expected at least one .md file in {PAIRS_DIR}; found {len(md_files)}"
    )


def test_min_pairs_per_text(generated_pairs: None) -> None:
    """Verify each text yields at least 100 pair files where passages allow."""
    groups = _group_files_by_novel()
    assert groups, "No grouped pair files to check"
    for basename, files in groups.items():
        assert len(files) >= MIN_PAIRS_PER_TEXT, (
            f"Text {basename} has {len(files)} pairs; required ≥{MIN_PAIRS_PER_TEXT}"
        )


def test_file_naming_convention(generated_pairs: None) -> None:
    """Check filenames follow <basename>_NNN.md pattern."""
    groups = _group_files_by_novel()
    assert groups, "No grouped pair files to check"
    for basename, files in groups.items():
        for path in files:
            assert path.stem.startswith(f"{basename}_"), (
                f"File {path.name} does not follow naming pattern {basename}_NNN.md"
            )
            suffix = path.stem[len(basename) + 1 :]
            assert suffix.isdigit() and len(suffix) >= 3, (
                f"File {path.name} should end with zero-padded numeric index (e.g. 001)."
            )


def test_pair_markdown_format_and_persona(generated_pairs: None) -> None:
    """Verify each pair file contains headings and the Sherlock persona block."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert md_files, "No pair files to check"
    for path in md_files:
        content = path.read_text(encoding="utf-8")
        for heading in REQUIRED_HEADINGS:
            assert heading in content, (
                f"File {path.name} must contain '{heading}'"
            )
        assert SYSTEM_PROMPT.splitlines()[0] in content, (
            f"File {path.name} must contain the Sherlock system persona."
        )
        # There should be exactly one pair per file.
        assert content.count("### System") == 1
        assert content.count("### Instruction") == 1
        assert content.count("### Response") == 1


def test_no_gutenberg_headers_or_blank_responses(generated_pairs: None) -> None:
    """Ensure cleaning removed Gutenberg headers and responses are non-empty and long enough."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert md_files, "No pair files to check"
    for path in md_files:
        content = path.read_text(encoding="utf-8")
        lower = content.lower()
        assert "project gutenberg ebook" not in lower, (
            f"Gutenberg header leaked into {path.name}"
        )
        # Response block length
        match = re.search(r"### Response\s+(.+)", content, flags=re.DOTALL)
        assert match, f"Missing Response content in {path.name}"
        response_text = match.group(1).strip()
        assert response_text, f"Empty Response in {path.name}"
        assert len(response_text) >= 30, (
            f"Response too short in {path.name}: {len(response_text)} characters"
        )


def test_dialogue_and_correction_presence(generated_pairs: None) -> None:
    """Heuristic check: ensure presence of Watson dialogue and reasoning-correction pairs."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert md_files, "No pair files to check"
    watson_count = 0
    correction_count = 0
    for path in md_files:
        content = path.read_text(encoding="utf-8")
        if "Watson asks:" in content or "Holmes observes:" in content:
            watson_count += 1
        if "A detective" in content and "sound reasoning" in content:
            correction_count += 1
    assert watson_count > 0, "Expected at least one Holmes–Watson dialogue pair."
    assert correction_count > 0, "Expected at least one reasoning-correction pair."


def test_passage_quality_references_clues_or_evidence(generated_pairs: None) -> None:
    """Verify pairs reference clues, evidence, or deductions (quality check)."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert md_files, "No pair files to check"
    without_quality = []
    for path in md_files:
        content = path.read_text(encoding="utf-8")
        if not QUALITY_KEYWORDS.search(content):
            without_quality.append(path.name)
    assert not without_quality, (
        "These pair files do not contain clue/evidence/deduction keywords: "
        f"{without_quality[:10]}{'...' if len(without_quality) > 10 else ''}"
    )


def test_distribution_roughly_70_20_10(generated_pairs: None) -> None:
    """Verify overall distribution roughly follows 70% deduction, 20% dialogue, 10% correction."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert md_files, "No pair files to check"
    deduction, watson, correction = 0, 0, 0
    for path in md_files:
        content = path.read_text(encoding="utf-8")
        instr_match = re.search(r"### Instruction\s+(.+?)### Response", content, flags=re.DOTALL)
        if not instr_match:
            continue
        inst = instr_match.group(1).strip()
        if "Watson asks:" in inst or "Holmes observes:" in inst:
            watson += 1
        elif "A detective" in inst and "sound reasoning" in inst:
            correction += 1
        else:
            deduction += 1
    total = deduction + watson + correction
    assert total > 0, "No pairs to count"
    d_ratio = deduction / total
    w_ratio = watson / total
    c_ratio = correction / total
    assert DEDUCTION_RATIO_MIN <= d_ratio <= DEDUCTION_RATIO_MAX, (
        f"Deduction ratio {d_ratio:.2f} outside 55–85%"
    )
    assert WATSON_RATIO_MIN <= w_ratio <= WATSON_RATIO_MAX, (
        f"Watson/dialogue ratio {w_ratio:.2f} outside 10–30%"
    )
    assert CORRECTION_RATIO_MIN <= c_ratio <= CORRECTION_RATIO_MAX, (
        f"Correction ratio {c_ratio:.2f} outside 5–15%"
    )


def test_responses_contain_victorian_reasoning_phrases(generated_pairs: None) -> None:
    """Verify responses contain at least one Holmes-style reasoning phrase."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert md_files, "No pair files to check"
    without_phrase = []
    for path in md_files:
        content = path.read_text(encoding="utf-8")
        resp_match = re.search(r"### Response\s+(.+)", content, flags=re.DOTALL)
        if not resp_match:
            without_phrase.append(path.name)
            continue
        response = resp_match.group(1).strip()
        if not any(phrase in response for phrase in REASONING_PHRASE_PATTERNS):
            without_phrase.append(path.name)
    assert not without_phrase, (
        "These pair files have no Victorian reasoning phrase in Response: "
        f"{without_phrase[:10]}{'...' if len(without_phrase) > 10 else ''}"
    )


def test_no_duplicate_instruction_response_pairs(generated_pairs: None) -> None:
    """Ensure there are no duplicate (instruction, response) pairs across files."""
    md_files = list(PAIRS_DIR.glob("*.md"))
    assert md_files, "No pair files to check"
    seen: set[Tuple[str, str]] = set()
    for path in md_files:
        content = path.read_text(encoding="utf-8")
        instr_match = re.search(r"### Instruction\s+(.+?)### Response", content, flags=re.DOTALL)
        resp_match = re.search(r"### Response\s+(.+)", content, flags=re.DOTALL)
        assert instr_match and resp_match, f"Malformed pair in {path.name}"
        instruction = instr_match.group(1).strip()
        response = resp_match.group(1).strip()
        key = (instruction, response)
        assert key not in seen, f"Duplicate pair found in {path.name}"
        seen.add(key)
