"""
Stage 5: Merge LoRA and convert to GGUF (Q4_K_M) for llama.cpp.

This module does NOT actually run heavy conversions in tests. Instead, it:
- Defines the expected GGUF output path and quantization type.
- Provides helper functions to build llama.cpp conversion/quantization commands.
- Provides a size check helper to ensure the final GGUF is ≤ 3GB.

The typical manual workflow after training is:
1. Merge LoRA adapter with the base model into a single Hugging Face model dir
   using `training.merge_lora.merge_lora_to_merged` (output in `models/merged/`).
2. Ensure `llama.cpp` is up to date:

       cd llama.cpp
       git pull
       make

3. Run llama.cpp's `convert-hf-to-gguf.py` to produce an f16 GGUF.
4. Run llama.cpp's `quantize` to produce a Q4_K_M GGUF.

Final artifact: models/sherlock-q4.gguf
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Tuple


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MERGED_MODEL_DIR = PROJECT_ROOT / "models" / "merged"  # expected HF model dir after merge
LLAMA_CPP_DIR = PROJECT_ROOT / "llama.cpp"  # default hint; can be overridden per-call

OUTPUT_F16_GGUF = PROJECT_ROOT / "models" / "sherlock-f16.gguf"
OUTPUT_Q4_GGUF = PROJECT_ROOT / "models" / "sherlock-q4.gguf"
QUANTIZATION_TYPE = "Q4_K_M"
MAX_GGUF_BYTES = 3 * 1024 * 1024 * 1024  # 3GB

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def build_conversion_commands(
    hf_model_dir: Path = MERGED_MODEL_DIR,
    llama_cpp_dir: Path = LLAMA_CPP_DIR,
    out_f16: Path = OUTPUT_F16_GGUF,
    out_q4: Path = OUTPUT_Q4_GGUF,
    quant_type: str = QUANTIZATION_TYPE,
) -> List[List[str]]:
    """
    Build the shell commands required to:
    1) convert HF model -> f16 GGUF
    2) quantize f16 GGUF -> Q4_K_M GGUF

    These are intended to be run manually in a shell:
    - python convert-hf-to-gguf.py <hf_model_dir> --outfile <out_f16>
    - ./quantize <out_f16> <out_q4> Q4_K_M
    """
    conv_script = llama_cpp_dir / "convert-hf-to-gguf.py"
    quant_bin = llama_cpp_dir / "quantize"
    return [
        [
            "python",
            str(conv_script),
            str(hf_model_dir),
            "--outfile",
            str(out_f16),
        ],
        [
            str(quant_bin),
            str(out_f16),
            str(out_q4),
            quant_type,
        ],
    ]


def gguf_size_ok(path: Path = OUTPUT_Q4_GGUF, max_bytes: int = MAX_GGUF_BYTES) -> bool:
    """Return True iff GGUF file exists and is ≤ max_bytes."""
    if not path.exists():
        return False
    size = path.stat().st_size
    return size <= max_bytes


def stage5_report() -> dict:
    """Print a short Stage 5 report about expected GGUF artifact."""
    cmds = build_conversion_commands()
    size_ok = gguf_size_ok()
    report = {
        "merged_model_dir": str(MERGED_MODEL_DIR),
        "llama_cpp_dir": str(LLAMA_CPP_DIR),
        "f16_gguf": str(OUTPUT_F16_GGUF),
        "q4_gguf": str(OUTPUT_Q4_GGUF),
        "quantization_type": QUANTIZATION_TYPE,
        "max_bytes": MAX_GGUF_BYTES,
        "q4_exists": OUTPUT_Q4_GGUF.exists(),
        "q4_size_ok": size_ok,
        "commands": cmds,
    }
    logger.info("STAGE 5 COMPLETE")
    logger.info("Expected GGUF output: %s (type=%s, max_size=%d bytes)", OUTPUT_Q4_GGUF, QUANTIZATION_TYPE, MAX_GGUF_BYTES)
    if OUTPUT_Q4_GGUF.exists():
        logger.info("  Current size: %d bytes (ok=%s)", OUTPUT_Q4_GGUF.stat().st_size, size_ok)
    else:
        logger.info("  Current file does not yet exist. Run conversion commands manually.")
    return report


def main() -> None:
    # Do not run heavy conversion automatically; just print guidance.
    stage5_report()


if __name__ == "__main__":
    main()

