"""
QLoRA fine-tuning script for Llama-3.2-1B-Instruct -> Sherlock Holmes.

Small, self-contained script that:
- Loads meta-llama/Llama-3.2-1B-Instruct in 4-bit (QLoRA)
- Trains on data/processed/train.jsonl (field: "text")
- Saves LoRA adapter to a versioned path (see training/model_version.py; v1 = models/llama32-1b-sherlock-lora)

Prereqs:
- You have access to meta-llama/Llama-3.2-1B-Instruct and are logged in:
  python -m huggingface_hub login
- data/processed/train.jsonl exists (built by your existing pipeline)
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

# Versioned output paths (training/model_version.py)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from training.model_version import get_lora_dir

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)
from trl import SFTConfig, SFTTrainer


@dataclass
class QLoRAConfig:
    # Local folder with downloaded Llama 3.2 1B Instruct (HF format)
    base_model_id: str = str(Path(__file__).resolve().parent / "models" / "Llama-3.2-1b-Instruct")
    train_jsonl: str = "data/processed/train.jsonl"
    output_dir: str = ""  # set from get_lora_dir() if empty

    # LoRA
    lora_r: int = 32
    lora_alpha: int = 64
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

    # QLoRA 4-bit
    load_in_4bit: bool = True
    bnb_4bit_compute_dtype: torch.dtype = torch.float16
    bnb_4bit_quant_type: str = "nf4"
    bnb_4bit_use_double_quant: bool = True

    # Training
    per_device_train_batch_size: int = 2
    gradient_accumulation_steps: int = 8
    learning_rate: float = 2e-4
    num_train_epochs: int = 3
    warmup_ratio: float = 0.05
    lr_scheduler_type: str = "cosine"
    weight_decay: float = 0.01
    max_seq_length: int = 2048

    logging_steps: int = 10
    save_steps: int = 500


if __name__ == "__main__":
    cfg = QLoRAConfig()
    if not cfg.output_dir:
        cfg.output_dir = str(get_lora_dir())

    if not torch.cuda.is_available():
        raise RuntimeError(
            "CUDA not available. This script requires a GPU for fine-tuning. "
            "Install PyTorch with CUDA support, e.g. pip install torch --index-url https://download.pytorch.org/whl/cu118"
        )

    # 1) Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        cfg.base_model_id,
        use_fast=True,
        trust_remote_code=True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 2) 4-bit quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=cfg.load_in_4bit,
        bnb_4bit_compute_dtype=cfg.bnb_4bit_compute_dtype,
        bnb_4bit_quant_type=cfg.bnb_4bit_quant_type,
        bnb_4bit_use_double_quant=cfg.bnb_4bit_use_double_quant,
    )

    # 3) Base model in 4-bit (QLoRA) - force GPU
    model = AutoModelForCausalLM.from_pretrained(
        cfg.base_model_id,
        quantization_config=bnb_config,
        device_map={"": 0},
        trust_remote_code=True,
    )
    model.config.use_cache = False

    # 4) LoRA config
    lora_cfg = LoraConfig(
        r=cfg.lora_r,
        lora_alpha=cfg.lora_alpha,
        lora_dropout=cfg.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=list(cfg.target_modules),
    )
    model = get_peft_model(model, lora_cfg)

    # 5) Dataset: your existing chat-template text field
    dataset = load_dataset("json", data_files=cfg.train_jsonl, split="train")

    def formatting_func(examples):
        # Each example has {"text": "<chat template>"}
        return examples["text"]

    # 6) SFTConfig (TRL 0.29+ uses SFTConfig for args; includes max_length)
    args = SFTConfig(
        output_dir=cfg.output_dir,
        per_device_train_batch_size=cfg.per_device_train_batch_size,
        gradient_accumulation_steps=cfg.gradient_accumulation_steps,
        learning_rate=cfg.learning_rate,
        num_train_epochs=cfg.num_train_epochs,
        warmup_ratio=cfg.warmup_ratio,
        lr_scheduler_type=cfg.lr_scheduler_type,
        weight_decay=cfg.weight_decay,
        logging_steps=cfg.logging_steps,
        save_steps=cfg.save_steps,
        save_total_limit=2,
        eval_strategy="no",
        fp16=False,
        bf16=True,
        report_to=[],
        max_length=cfg.max_seq_length,
    )

    # 7) SFTTrainer (TRL 0.29+ uses processing_class; max_length comes from SFTConfig)
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        args=args,
        processing_class=tokenizer,
        formatting_func=formatting_func,
    )

    trainer.train()
    trainer.model.save_pretrained(cfg.output_dir)
    tokenizer.save_pretrained(cfg.output_dir)

