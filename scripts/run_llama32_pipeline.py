#!/usr/bin/env python3
"""
Convenience pipeline runner for Llama 3.2 1B QLoRA (Sherlock).

Runs (by default):
  1) training/collect_pairs.py
  2) training/build_dataset.py
  3) scripts/analyze_overfitting.py
  4) train_llama32_1b_qlora.py            (GPU-only)
  5) merge_llama32_lora.py
  6) scripts/build_gguf_versioned.py      (prints commands; optional --gguf-run)

Usage:
  python scripts/run_llama32_pipeline.py
  python scripts/run_llama32_pipeline.py --bump-version
  python scripts/run_llama32_pipeline.py --skip-train
  python scripts/run_llama32_pipeline.py --skip-train --skip-merge
  python scripts/run_llama32_pipeline.py --bump-version --gguf-run
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def run_step(argv: list[str], label: str) -> None:
    print(f"\n=== {label} ===")
    print("Running:", " ".join(argv))
    subprocess.run(argv, cwd=str(PROJECT_ROOT), check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--bump-version",
        action="store_true",
        help="Run scripts/bump_model_version.py before training (v1->v2, v2->v3...).",
    )
    ap.add_argument(
        "--skip-train",
        action="store_true",
        help="Skip GPU QLoRA training step (train_llama32_1b_qlora.py).",
    )
    ap.add_argument(
        "--skip-merge",
        action="store_true",
        help="Skip merge step (merge_llama32_lora.py).",
    )
    ap.add_argument(
        "--skip-data",
        action="store_true",
        help="Skip dataset generation (collect_pairs + build_dataset).",
    )
    ap.add_argument(
        "--skip-analysis",
        action="store_true",
        help="Skip scripts/analyze_overfitting.py.",
    )
    ap.add_argument(
        "--gguf-run",
        action="store_true",
        help="Run scripts/build_gguf_versioned.py --run (requires llama.cpp present & built).",
    )
    args = ap.parse_args()

    py = sys.executable or "python"

    try:
        if not args.skip_data:
            run_step([py, "training/collect_pairs.py"], "Stage 2: collect pairs")
            run_step([py, "training/build_dataset.py"], "Stage 3: build dataset")

        if not args.skip_analysis:
            run_step([py, "scripts/analyze_overfitting.py"], "Dataset overfitting analysis")

        if args.bump_version:
            run_step([py, "scripts/bump_model_version.py"], "Bump model version")

        if not args.skip_train:
            run_step([py, "train_llama32_1b_qlora.py"], "Stage 4: Llama32 QLoRA training (GPU)")

        if not args.skip_merge:
            run_step([py, "merge_llama32_lora.py"], "Merge LoRA into base (HF)")

        gguf_cmd = [py, "scripts/build_gguf_versioned.py"]
        if args.gguf_run:
            gguf_cmd.append("--run")
        run_step(gguf_cmd, "GGUF: versioned convert + quantize commands")

        print("\nPipeline complete.")
    except subprocess.CalledProcessError as e:
        raise SystemExit(e.returncode) from e


if __name__ == "__main__":
    main()

