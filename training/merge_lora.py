"""
Utility script: merge LoRA adapter with base model into a single HF model dir.

This is the critical step between Stage 4 (LoRA training) and Stage 5
(GGUF conversion). If you skip this, you'll convert the base model only
and lose the Sherlock Holmes fine-tuning.

Usage (after Qwen LoRA training has produced `models/sherlock-lora/`):

    python -m training.merge_lora

This will create:

    models/merged/

which `training.convert_to_gguf` expects as the HF source for GGUF conversion.
"""

from __future__ import annotations

import logging
from pathlib import Path

from training.train_lora import BASE_MODEL_ID, LORA_OUT_DIR, PROJECT_ROOT


MERGED_MODEL_DIR = PROJECT_ROOT / "models" / "merged"

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def merge_lora_to_merged(
    base_model_id: str = BASE_MODEL_ID,
    lora_dir: Path = LORA_OUT_DIR,
    out_dir: Path = MERGED_MODEL_DIR,
) -> Path:
    """
    Load base model + LoRA adapter, merge, and save to out_dir.

    Requires:
    - transformers
    - peft
    """
    try:
        from transformers import AutoModelForCausalLM  # type: ignore
        from peft import PeftModel  # type: ignore
    except Exception as exc:  # pragma: no cover - heavy deps checked in runtime
        raise RuntimeError(
            "Missing dependencies for merge: install transformers and peft."
        ) from exc

    if not lora_dir.exists():
        raise FileNotFoundError(f"LoRA adapter directory not found: {lora_dir}")

    logger.info("Loading base model: %s", base_model_id)
    base = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        trust_remote_code=False,
    )

    logger.info("Loading LoRA adapter from: %s", lora_dir)
    model = PeftModel.from_pretrained(base, str(lora_dir))

    logger.info("Merging LoRA adapter into base model...")
    merged = model.merge_and_unload()

    out_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Saving merged model to: %s", out_dir)
    merged.save_pretrained(str(out_dir))
    return out_dir


def main() -> None:
    merge_lora_to_merged()


if __name__ == "__main__":
    main()

