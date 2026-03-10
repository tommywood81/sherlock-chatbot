"""
Stage 4 tests: verify LoRA training configuration is correct and stable.

These tests avoid importing heavy ML dependencies at import time.
"""

from __future__ import annotations

from training.train_lora import (
    ASSISTANT_HEADER,
    BASE_MODEL_ID,
    BATCH_SIZE,
    EPOCHS,
    LEARNING_RATE,
    LORA_ALPHA,
    LORA_DROPOUT,
    LORA_OUT_DIR,
    LORA_RANK,
    MAX_SEQ_LENGTH,
    TrainingConfig,
    get_training_config,
    mask_labels_to_assistant_only,
)


def test_training_config_values() -> None:
    cfg = get_training_config()
    assert isinstance(cfg, TrainingConfig)
    assert cfg.base_model_id == BASE_MODEL_ID
    assert cfg.epochs == EPOCHS == 3
    assert cfg.batch_size == BATCH_SIZE == 2
    assert cfg.learning_rate == LEARNING_RATE == 2e-4
    assert cfg.lora_r == LORA_RANK == 8
    assert cfg.lora_alpha == LORA_ALPHA == 16
    assert cfg.lora_dropout == LORA_DROPOUT == 0.05
    assert cfg.output_dir == LORA_OUT_DIR
    assert cfg.max_seq_length == MAX_SEQ_LENGTH == 1024


def test_assistant_only_masking_masks_prefix_and_unmasks_suffix() -> None:
    # Fake token ids:
    # [1,2,3] = system/user tokens
    # [9,9] = assistant header tokens
    # [4,5,6] = assistant response tokens
    assistant_header_ids = [9, 9]
    input_ids = [1, 2, 3, 9, 9, 4, 5, 6]
    labels = input_ids.copy()
    masked = mask_labels_to_assistant_only(input_ids, labels, assistant_header_ids)
    # Prefix masked
    assert masked[:5] == [-100, -100, -100, -100, -100]
    # Assistant tokens unmasked
    assert masked[5:] == [4, 5, 6]


def test_masking_no_header_masks_all() -> None:
    assistant_header_ids = [9, 9]
    input_ids = [1, 2, 3, 4, 5]
    labels = input_ids.copy()
    masked = mask_labels_to_assistant_only(input_ids, labels, assistant_header_ids)
    assert masked == [-100] * len(labels)

