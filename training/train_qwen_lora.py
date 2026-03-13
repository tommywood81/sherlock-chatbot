"""
CPU-only LoRA fine-tuning for a local Qwen2.5-1.5B base model.

Base model (local): models/Qwn2Point5_1Point5b/
Dataset: data/processed/train.jsonl (Stage 3 output)
Output LoRA adapter: models/sherlock-lora/

Design:
- CPU-only, float32 (safe on 64 GB RAM)
- LoRA on attention projections: q_proj, k_proj, v_proj, o_proj
- Small batch size, gradient accumulation to keep memory low
- Max sequence length 512
- No bitsandbytes / QLoRA (GPU-only); we still later quantize the merged model
  to Q4_K_M GGUF for a 4 GB CPU droplet with llama.cpp.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import torch
from datasets import load_dataset  # type: ignore
from peft import LoraConfig, get_peft_model  # type: ignore
from transformers import (  # type: ignore
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
TRAIN_JSONL_PATH = PROCESSED_DIR / "train.jsonl"

BASE_MODEL_DIR = PROJECT_ROOT / "models" / "Qwn2Point5_1Point5b"
LORA_OUT_DIR = PROJECT_ROOT / "models" / "sherlock-lora"

MAX_SEQ_LENGTH = 512

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class TrainingConfig:
    base_model_dir: Path = BASE_MODEL_DIR
    train_path: Path = TRAIN_JSONL_PATH
    output_dir: Path = LORA_OUT_DIR

    # LoRA settings
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: tuple = ("q_proj", "k_proj", "v_proj", "o_proj")

    # Training settings
    max_seq_length: int = MAX_SEQ_LENGTH
    num_train_epochs: int = 2  # keep small for CPU
    per_device_train_batch_size: int = 1
    gradient_accumulation_steps: int = 8
    learning_rate: float = 2e-4
    logging_steps: int = 10
    save_strategy: str = "epoch"


def get_training_config() -> TrainingConfig:
    return TrainingConfig()


def train(config: Optional[TrainingConfig] = None) -> Path:
    cfg = config or get_training_config()

    if not cfg.train_path.exists():
        raise FileNotFoundError(f"Training dataset not found: {cfg.train_path}")
    if not cfg.base_model_dir.exists():
        raise FileNotFoundError(f"Base model directory not found: {cfg.base_model_dir}")

    # Decide device: prefer GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Using device: %s", device)

    # Load tokenizer from local base dir
    logger.info("Loading tokenizer from %s", cfg.base_model_dir)
    tokenizer = AutoTokenizer.from_pretrained(
        cfg.base_model_dir,
        trust_remote_code=True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load base model from local dir
    if device == "cuda":
        logger.info("Loading base model from %s (GPU, float16)", cfg.base_model_dir)
        torch_dtype = torch.float16
        device_map = {"": device}
    else:
        logger.info("Loading base model from %s (CPU, float32)", cfg.base_model_dir)
        torch_dtype = None  # default float32 on CPU
        device_map = {"": "cpu"}

    model = AutoModelForCausalLM.from_pretrained(
        cfg.base_model_dir,
        trust_remote_code=True,
        torch_dtype=torch_dtype,
        device_map=device_map,
    )
    model.config.use_cache = False
    model.gradient_checkpointing_enable()

    # LoRA configuration
    lora_cfg = LoraConfig(
        r=cfg.lora_r,
        lora_alpha=cfg.lora_alpha,
        lora_dropout=cfg.lora_dropout,
        target_modules=list(cfg.target_modules),
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_cfg)

    # Dataset: full conversation strings from train.jsonl
    logger.info("Loading training dataset from %s", cfg.train_path)
    dataset = load_dataset("json", data_files=str(cfg.train_path), split="train")

    def tokenize_fn(batch: Dict[str, Any]) -> Dict[str, Any]:
        return tokenizer(
            batch["text"],
            truncation=True,
            max_length=cfg.max_seq_length,
            padding=False,
        )

    tokenized = dataset.map(tokenize_fn, batched=True, remove_columns=dataset.column_names)

    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    use_fp16 = device == "cuda"

    training_args = TrainingArguments(
        output_dir=str(cfg.output_dir),
        num_train_epochs=cfg.num_train_epochs,
        per_device_train_batch_size=cfg.per_device_train_batch_size,
        gradient_accumulation_steps=cfg.gradient_accumulation_steps,
        learning_rate=cfg.learning_rate,
        logging_steps=cfg.logging_steps,
        logging_first_step=True,
        save_strategy=cfg.save_strategy,
        save_total_limit=2,
        gradient_checkpointing=True,
        fp16=use_fp16,
        bf16=False,
        report_to=[],
        dataloader_num_workers=0,
        dataloader_pin_memory=False,
    )

    logger.info("Training config:\n%s", json.dumps(asdict(cfg), indent=2, default=str))
    logger.info("TrainingArguments:\n%s", training_args.to_json_string())
    logger.info("Starting CPU-only LoRA training on %d examples ...", len(tokenized))

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        data_collator=data_collator,
    )

    trainer.train()

    cfg.output_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Saving LoRA adapter to %s", cfg.output_dir)
    trainer.model.save_pretrained(str(cfg.output_dir))
    tokenizer.save_pretrained(str(cfg.output_dir))

    return cfg.output_dir


def main() -> None:
    train()


if __name__ == "__main__":
    main()

