"""
Stage 4: LoRA fine-tuning.

Trains a LoRA adapter on the Stage 3 dataset `data/processed/train.jsonl` using:
- transformers
- peft
- datasets
- trl
- accelerate
- sentencepiece
- bitsandbytes

Base model: TinyLlama/TinyLlama-1.1B-Chat-v1.0

Training target rule:
- Compute loss ONLY on assistant tokens (system + user tokens masked out).

This script is designed to be deterministic and low-RAM friendly for CPU-only
environments, but actual training typically benefits from a GPU. The adapter is
saved to `models/lora/`.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
TRAIN_JSONL_PATH = PROCESSED_DIR / "train.jsonl"
LORA_OUT_DIR = PROJECT_ROOT / "models" / "lora"

BASE_MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
MAX_SEQ_LENGTH = 1024

# LoRA parameters tuned for 1.1B model
LORA_RANK = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05

# Training parameters (small-model–friendly, GPU recommended)
EPOCHS = 4
BATCH_SIZE = 2
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.03
WEIGHT_DECAY = 0.01
GRADIENT_ACCUM_STEPS = 4

# Llama chat markers used in Stage 3 text template
ASSISTANT_HEADER = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TrainingConfig:
    base_model_id: str = BASE_MODEL_ID
    train_path: Path = TRAIN_JSONL_PATH
    output_dir: Path = LORA_OUT_DIR
    max_seq_length: int = MAX_SEQ_LENGTH

    lora_r: int = LORA_RANK
    lora_alpha: int = LORA_ALPHA
    lora_dropout: float = LORA_DROPOUT

    epochs: int = EPOCHS
    batch_size: int = BATCH_SIZE
    learning_rate: float = LEARNING_RATE
    warmup_ratio: float = WARMUP_RATIO
    weight_decay: float = WEIGHT_DECAY
    grad_accum_steps: int = GRADIENT_ACCUM_STEPS


def get_training_config() -> TrainingConfig:
    """Return the Stage 4 training configuration (pure, testable)."""
    return TrainingConfig()


def _require_dependencies() -> None:
    """Import heavy deps only when training is executed."""
    missing: List[str] = []
    for mod in ("transformers", "peft", "datasets", "trl", "accelerate"):
        try:
            __import__(mod)
        except Exception:
            missing.append(mod)
    if missing:
        raise RuntimeError(
            "Missing required dependencies for training: "
            + ", ".join(missing)
            + ". Install pipeline requirements before running training."
        )


def mask_labels_to_assistant_only(input_ids: List[int], labels: List[int], assistant_token_ids: List[int]) -> List[int]:
    """
    Mask labels so only the assistant response contributes to loss.
    Finds the last occurrence of assistant header token sequence and un-masks
    tokens after it, up to (but not including) the final EOT.
    """
    # Default: mask everything
    masked = [-100] * len(labels)

    def find_subsequence(haystack: List[int], needle: List[int]) -> int:
        for i in range(0, len(haystack) - len(needle) + 1):
            if haystack[i : i + len(needle)] == needle:
                return i
        return -1

    start = -1
    # Find LAST assistant header occurrence
    search_from = 0
    while True:
        idx = find_subsequence(input_ids[search_from:], assistant_token_ids)
        if idx == -1:
            break
        start = search_from + idx
        search_from = start + 1

    if start == -1:
        return masked

    start_labels = start + len(assistant_token_ids)
    for i in range(start_labels, len(labels)):
        masked[i] = labels[i]
    return masked


def train(config: Optional[TrainingConfig] = None, debug: bool = False) -> Path:
    """
    Run LoRA fine-tuning and save adapter to config.output_dir.
    Returns the output directory path.
    """
    _require_dependencies()
    cfg = config or get_training_config()

    from datasets import load_dataset  # type: ignore
    from peft import LoraConfig, get_peft_model  # type: ignore
    from transformers import (  # type: ignore
        AutoModelForCausalLM,
        AutoTokenizer,
        EarlyStoppingCallback,
        TrainingArguments,
    )
    from trl import SFTTrainer  # type: ignore

    if not cfg.train_path.exists():
        raise FileNotFoundError(f"Training dataset not found: {cfg.train_path}")

    tokenizer = AutoTokenizer.from_pretrained(cfg.base_model_id)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load dataset from JSONL (field: text) and create a small validation split
    dataset = load_dataset("json", data_files=str(cfg.train_path), split="train")
    split = dataset.train_test_split(test_size=0.1, seed=42)
    train_ds = split["train"]
    val_ds = split["test"]

    if debug:
        # Use a small subset for faster CPU-only debugging
        max_examples = min(200, len(train_ds))
        logger.info("DEBUG MODE: selecting first %d examples out of %d", max_examples, len(train_ds))
        train_ds = train_ds.select(range(max_examples))
        val_ds = val_ds.select(range(min(40, len(val_ds))))

    # LoRA config
    lora_cfg = LoraConfig(
        r=cfg.lora_r,
        lora_alpha=cfg.lora_alpha,
        lora_dropout=cfg.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
    )

    # Prefer GPU if available; fall back to CPU.
    use_cuda = torch.cuda.is_available()
    model = AutoModelForCausalLM.from_pretrained(
        cfg.base_model_id,
        torch_dtype="auto",
        low_cpu_mem_usage=True,
        device_map="auto" if use_cuda else None,
    )
    model = get_peft_model(model, lora_cfg)

    # Token ids for masking boundaries
    assistant_token_ids = tokenizer(ASSISTANT_HEADER, add_special_tokens=False)["input_ids"]

    def tokenize_and_mask(batch: Dict[str, List[str]]) -> Dict[str, Any]:
        toks = tokenizer(
            batch["text"],
            truncation=True,
            padding=False,
            max_length=cfg.max_seq_length,
        )
        labels = [ids.copy() for ids in toks["input_ids"]]
        masked_labels = [
            mask_labels_to_assistant_only(ids, lab, assistant_token_ids)
            for ids, lab in zip(toks["input_ids"], labels)
        ]
        toks["labels"] = masked_labels
        return toks

    tokenized_train = train_ds.map(tokenize_and_mask, batched=True, remove_columns=train_ds.column_names)
    tokenized_val = val_ds.map(tokenize_and_mask, batched=True, remove_columns=val_ds.column_names)

    num_epochs = 1 if debug else cfg.epochs

    args = TrainingArguments(
        output_dir=str(cfg.output_dir),
        num_train_epochs=num_epochs,
        per_device_train_batch_size=cfg.batch_size,
        learning_rate=cfg.learning_rate,
        warmup_ratio=cfg.warmup_ratio,
        weight_decay=cfg.weight_decay,
        gradient_accumulation_steps=cfg.grad_accum_steps,
        logging_steps=10,
        logging_first_step=True,
        # transformers>=5 renamed evaluation_strategy -> eval_strategy
        eval_strategy="steps",
        eval_steps=100,
        save_strategy="steps",
        save_steps=100,
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        report_to=[],
        fp16=use_cuda,
        dataloader_num_workers=0,
        dataloader_pin_memory=False,
    )

    logger.info(
        "Preparing SFTTrainer (epochs=%d, batch_size=%d, max_seq_length=%d, examples=%d, debug=%s)",
        num_epochs,
        cfg.batch_size,
        cfg.max_seq_length,
        len(tokenized_train),
        debug,
    )

    trainer = SFTTrainer(
        model=model,
        args=args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        processing_class=tokenizer,  # modern TRL expects 'processing_class' instead of 'tokenizer'
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    logger.info("Starting trainer.train() ...")
    trainer.train()
    logger.info("trainer.train() finished.")
    cfg.output_dir.mkdir(parents=True, exist_ok=True)
    trainer.model.save_pretrained(str(cfg.output_dir))
    tokenizer.save_pretrained(str(cfg.output_dir))

    logger.info("Saved LoRA adapter to %s", cfg.output_dir)
    return cfg.output_dir


def stage4_report() -> Dict[str, Any]:
    """Print a short Stage 4 report (configuration only)."""
    cfg = get_training_config()
    report = {
        "base_model": cfg.base_model_id,
        "train_dataset": str(cfg.train_path),
        "output_dir": str(cfg.output_dir),
        "lora": {"r": cfg.lora_r, "alpha": cfg.lora_alpha, "dropout": cfg.lora_dropout},
        "training": {"epochs": cfg.epochs, "batch_size": cfg.batch_size, "learning_rate": cfg.learning_rate},
        "max_seq_length": cfg.max_seq_length,
        "loss_masking": "assistant_only",
    }
    logger.info("STAGE 4 COMPLETE")
    logger.info(json.dumps(report, indent=2))
    return report


def main() -> None:
    # Do not auto-train by default; print config report.
    stage4_report()


if __name__ == "__main__":
    main()

