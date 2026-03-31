"""
Lightweight tests for the merge_lora utility.

These tests avoid importing heavy ML dependencies; they only validate
paths and configuration wiring.
"""

from __future__ import annotations

from pathlib import Path

from training.merge_lora import MERGED_MODEL_DIR
from training.train_lora import BASE_MODEL_ID, LORA_OUT_DIR, PROJECT_ROOT


def test_merge_paths_and_ids() -> None:
    assert BASE_MODEL_ID == "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    assert LORA_OUT_DIR == PROJECT_ROOT / "models" / "lora"
    assert MERGED_MODEL_DIR == PROJECT_ROOT / "models" / "merged"

