"""
QLoRA fine-tuning script for a 3B Sherlock Holmes LLM.

Design goals (per specification):
1. 4-bit loading (nf4, float16 compute, double quantization).
2. Train only LoRA adapters on attention/MLP projections:
   q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj.
3. Gradient checkpointing enabled.
4. Small per-device batch size (1) with gradient_accumulation_steps=8.
5. Max sequence length <= 512 tokens.
6. Use paged AdamW optimizer suitable for QLoRA.
7. Limit training epochs to 2–3 over ~3.2k examples (here: 2 by default).
8. Preserve narrative units by training on full conversation strings (no mid-example
   chunking; truncation is token-based only).
9. Keep memory usage low (4-bit weights, checkpointing, small batches).
10. Save LoRA adapter separately for later merge with the base 3B model.
11. Print all key training/model/optimizer settings for reproducibility.
12. Avoid unnecessary full-precision weights or heavy extra logging.

NOTE: This script assumes a GPU is available and that you have access to the
chosen 3B base model on Hugging Face. For a CPU-only environment, training
time will be very long even with QLoRA.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict

import torch
from datasets import load_dataset  # type: ignore
from peft import LoraConfig, get_peft_model  # type: ignore
from transformers import (  # type: ignore
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TRAIN_JSONL_PATH = PROJECT_ROOT / "data" / "processed" / "train.jsonl"

# Base model: 3B class model. Replace with the exact ID you have access to.
BASE_MODEL_ID = "meta-llama/Llama-3.2-3B"

LORA_OUT_DIR = PROJECT_ROOT / "models" / "lora_3b_qlora"

MAX_SEQ_LENGTH = 512


@dataclass
class QLoRAConfig:
    base_model_id: str = BASE_MODEL_ID
    train_path: Path = TRAIN_JSONL_PATH
    output_dir: Path = LORA_OUT_DIR

    # QLoRA / 4-bit settings
    load_in_4bit: bool = True
    bnb_4bit_quant_type: str = "nf4"
    bnb_4bit_compute_dtype: str = "float16"
    bnb_4bit_use_double_quant: bool = True

    # LoRA settings
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: tuple = (
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    )

    # Training settings
    max_seq_length: int = MAX_SEQ_LENGTH
    epochs: int = 2
    per_device_batch_size: int = 1
    grad_accum_steps: int = 8
    learning_rate: float = 2e-4
    optimizer: str = "paged_adamw_32bit"


logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def get_qlora_config() -> QLoRAConfig:
    return QLoRAConfig()


def print_config(cfg: QLoRAConfig, training_args: TrainingArguments) -> None:
    logger.info("QLoRA configuration:\n%s", json.dumps(asdict(cfg), indent=2, default=str))
    logger.info("TrainingArguments:\n%s", training_args.to_json_string())


def train_qlora(cfg: QLoRAConfig | None = None) -> Path:
    cfg = cfg or get_qlora_config()

    if not cfg.train_path.exists():
        raise FileNotFoundError(f"Training dataset not found at {cfg.train_path}")

    # 4-bit quantization config
    compute_dtype = torch.float16
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=cfg.load_in_4bit,
        bnb_4bit_quant_type=cfg.bnb_4bit_quant_type,
        bnb_4bit_use_double_quant=cfg.bnb_4bit_use_double_quant,
        bnb_4bit_compute_dtype=compute_dtype,
    )

    logger.info("Loading tokenizer: %s", cfg.base_model_id)
    tokenizer = AutoTokenizer.from_pretrained(cfg.base_model_id, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    logger.info("Loading 4-bit base model: %s", cfg.base_model_id)
    model = AutoModelForCausalLM.from_pretrained(
        cfg.base_model_id,
        quantization_config=bnb_config,
        device_map="auto",
    )
    model.config.use_cache = False
    model.gradient_checkpointing_enable()

    # LoRA configuration
    lora_config = LoraConfig(
        r=cfg.lora_r,
        lora_alpha=cfg.lora_alpha,
        lora_dropout=cfg.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=list(cfg.target_modules),
    )
    model = get_peft_model(model, lora_config)

    # Dataset
    logger.info("Loading training dataset from %s", cfg.train_path)
    dataset = load_dataset("json", data_files=str(cfg.train_path), split="train")

    def tokenize_function(examples: Dict[str, Any]) -> Dict[str, Any]:
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=cfg.max_seq_length,
            padding=False,
        )

    tokenized = dataset.map(tokenize_function, batched=True, remove_columns=dataset.column_names)

    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    # Training arguments
    training_args = TrainingArguments(
        output_dir=str(cfg.output_dir),
        num_train_epochs=cfg.epochs,
        per_device_train_batch_size=cfg.per_device_batch_size,
        gradient_accumulation_steps=cfg.grad_accum_steps,
        learning_rate=cfg.learning_rate,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        weight_decay=0.0,
        logging_steps=10,
        logging_first_step=True,
        save_steps=500,
        save_total_limit=2,
        gradient_checkpointing=True,
        optim=cfg.optimizer,
        bf16=False,
        fp16=False,
        max_grad_norm=1.0,
        report_to=[],
    )

    print_config(cfg, training_args)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        data_collator=data_collator,
    )

    logger.info("Starting QLoRA training on %d examples ...", len(tokenized))
    trainer.train()
    logger.info("Training complete. Saving LoRA adapter to %s", cfg.output_dir)

    cfg.output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(cfg.output_dir))
    tokenizer.save_pretrained(str(cfg.output_dir))

    return cfg.output_dir


def main() -> None:
    train_qlora()


if __name__ == "__main__":
    main()

