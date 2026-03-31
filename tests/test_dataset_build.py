"""
Stage 3 tests: build JSONL dataset from Markdown pairs.

Validates:
- data/processed/train.jsonl exists
- record count equals number of Markdown pair files
- each record has required Llama chat template tokens
- system prompt contains Sherlock persona
- instruction/response are non-empty
- token length <= 1024 when transformers tokenizer is available
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from training.build_dataset import (
    BASE_TOKENIZER_ID,
    EOT,
    HDR_ASSIST,
    HDR_SYS,
    HDR_USER,
    LLAMA_BEGIN,
    MAX_SEQ_LENGTH,
    PAIRS_DIR,
    TRAIN_JSONL_PATH,
    build_jsonl_records,
    parse_pair_markdown,
    run,
)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_PATH = PROJECT_ROOT / "data" / "processed" / "train.jsonl"


@pytest.fixture(scope="module")
def built_dataset() -> None:
    """Build dataset once for this test module."""
    run()


def test_dataset_exists(built_dataset: None) -> None:
    assert PROCESSED_PATH.exists()
    assert PROCESSED_PATH.is_file()


def test_dataset_size_matches_pairs(built_dataset: None) -> None:
    pair_files = list(PAIRS_DIR.glob("*.md"))
    assert pair_files, "Expected Markdown pair files in data/pairs/"
    n_pairs = len(pair_files)
    n_lines = sum(1 for _ in PROCESSED_PATH.open("r", encoding="utf-8"))
    assert n_lines == n_pairs, f"Expected {n_pairs} records, found {n_lines}"


def test_jsonl_format_and_required_tokens(built_dataset: None) -> None:
    with PROCESSED_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            assert "text" in obj
            text = obj["text"]
            for token in (LLAMA_BEGIN, HDR_SYS, HDR_USER, HDR_ASSIST, EOT):
                assert token in text


def test_system_prompt_contains_sherlock_persona(built_dataset: None) -> None:
    # check first record
    first = PROCESSED_PATH.read_text(encoding="utf-8").splitlines()[0]
    obj = json.loads(first)
    assert "You are Sherlock Holmes, the consulting detective of Baker Street." in obj["text"]


def test_no_empty_instruction_or_response(built_dataset: None) -> None:
    # spot check parse on several files
    pair_files = sorted(PAIRS_DIR.glob("*.md"))[:10]
    for p in pair_files:
        pair = parse_pair_markdown(p.read_text(encoding="utf-8", errors="replace"))
        assert pair.instruction.strip()
        assert pair.response.strip()


def test_token_length_leq_1024_if_tokenizer_available(built_dataset: None) -> None:
    transformers = pytest.importorskip("transformers")
    from transformers import AutoTokenizer  # type: ignore

    tok = AutoTokenizer.from_pretrained(BASE_TOKENIZER_ID)
    # check a small sample for speed
    lines = PROCESSED_PATH.read_text(encoding="utf-8").splitlines()[:25]
    for line in lines:
        obj = json.loads(line)
        ids = tok(
            obj["text"],
            truncation=True,
            padding=False,
            max_length=MAX_SEQ_LENGTH,
        )["input_ids"]
        assert len(ids) <= MAX_SEQ_LENGTH

