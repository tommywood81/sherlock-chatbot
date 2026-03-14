"""
Convenience script: run the TinyLlama Sherlock pipeline end-to-end.

Stages:
1) Stage 2  - training.collect_pairs.run: generate instruction–response pairs from data/raw/
2) Stage 3  - training.build_dataset.run: build data/processed/train.jsonl
3) Stage 4  - training.train_lora.train: LoRA fine-tuning on TinyLlama-1.1B-Chat
4) Merge    - training.merge_lora.merge_lora_to_merged: merge LoRA into base model (models/merged/)
5) Report   - training.convert_to_gguf.stage5_report: print GGUF conversion + quantization commands

Heavy GGUF conversion via llama.cpp is still run manually, as documented.
"""

from __future__ import annotations

import logging

from training import build_dataset, collect_pairs, convert_to_gguf, merge_lora, train_lora


logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("=== Stage 2: generating Sherlock pairs from data/raw/ ===")
    collect_stats = collect_pairs.run()
    logger.info("Stage 2 stats: %s", collect_stats)

    logger.info("=== Stage 3: building train.jsonl from data/pairs/ ===")
    dataset_stats = build_dataset.run()
    logger.info("Stage 3 stats: %s", dataset_stats)

    logger.info("=== Stage 4: TinyLlama LoRA training ===")
    lora_dir = train_lora.train()
    logger.info("LoRA adapter saved to: %s", lora_dir)

    logger.info("=== Merge: combining TinyLlama base + LoRA into models/merged/ ===")
    merged_dir = merge_lora.merge_lora_to_merged()
    logger.info("Merged HF model saved to: %s", merged_dir)

    logger.info("=== Stage 5 report: GGUF conversion / quantization commands ===")
    gguf_report = convert_to_gguf.stage5_report()
    logger.info("Stage 5 report: %s", gguf_report)
    logger.info("Run the printed llama.cpp commands manually to produce the final GGUF.")


if __name__ == "__main__":
    main()

