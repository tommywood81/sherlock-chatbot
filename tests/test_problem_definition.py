"""
Stage 1 tests: verify problem definition document exists and meets specifications.
"""
import pytest
from pathlib import Path


# Path relative to project root; tests assume run from project root or with proper PYTHONPATH
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROBLEM_DEF_PATH = PROJECT_ROOT / "docs" / "problem_definition.md"

REQUIRED_SECTIONS = [
    "project objective",
    "dataset description",
    "training approach",
    "deployment constraints",
]

MIN_CONTENT_LENGTH = 300


def test_problem_definition_file_exists() -> None:
    """Verify docs/problem_definition.md exists."""
    assert PROBLEM_DEF_PATH.exists(), f"Expected file at {PROBLEM_DEF_PATH}"
    assert PROBLEM_DEF_PATH.is_file(), f"Expected a file, not directory: {PROBLEM_DEF_PATH}"


def test_problem_definition_contains_required_sections() -> None:
    """Verify the document contains all required section headings."""
    assert PROBLEM_DEF_PATH.exists(), "problem_definition.md must exist"
    content = PROBLEM_DEF_PATH.read_text(encoding="utf-8").lower()
    for section in REQUIRED_SECTIONS:
        assert section in content, f"Document must contain section: '{section}'"


def test_problem_definition_length_exceeds_minimum() -> None:
    """Verify document length is greater than 300 characters."""
    assert PROBLEM_DEF_PATH.exists(), "problem_definition.md must exist"
    content = PROBLEM_DEF_PATH.read_text(encoding="utf-8")
    assert len(content) > MIN_CONTENT_LENGTH, (
        f"Document must be longer than {MIN_CONTENT_LENGTH} characters (got {len(content)})"
    )
