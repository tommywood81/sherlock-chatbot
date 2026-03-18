#!/usr/bin/env python3
"""
Build a versioned GGUF artifact name (and optionally run the commands).

This prevents forgetting to name the GGUF with the current model version.

Reads:
  - model_version.txt (via training.model_version)

Uses:
  - merged HF model dir: models/llama32-1b-sherlock[-vN]-merged/
  - output GGUF paths:
      models/llama32-1b-sherlock[-vN]-f16.gguf
      models/llama32-1b-sherlock[-vN]-q4.gguf

By default, prints the commands you should run.
Optionally, pass --run to execute them (requires llama.cpp present & built).

Usage:
  python scripts/build_gguf_versioned.py
  python scripts/build_gguf_versioned.py --run
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Import version helpers (project-local, no external deps)
sys.path.insert(0, str(PROJECT_ROOT))
from training.model_version import (  # noqa: E402
    MODEL_STEM,
    get_merged_dir,
    get_model_version,
)


def _path_suffix(version: str) -> str:
    return "" if version == "v1" else f"-{version}"


def _llama_cpp_dir() -> Path:
    return PROJECT_ROOT / "llama.cpp"


def _find_convert_script(llama_cpp: Path) -> Path | None:
    # Common names across llama.cpp revisions
    candidates = [
        llama_cpp / "convert-hf-to-gguf.py",
        llama_cpp / "convert_hf_to_gguf.py",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _find_quantize_exe(llama_cpp: Path) -> Path | None:
    # Windows static build path (common in this repo’s README)
    candidates = [
        llama_cpp / "build" / "bin" / "llama-quantize.exe",
        llama_cpp / "build" / "bin" / "Release" / "llama-quantize.exe",
        # Linux/mac
        llama_cpp / "build" / "bin" / "llama-quantize",
        llama_cpp / "build" / "bin" / "Release" / "llama-quantize",
        # Older naming
        llama_cpp / "build" / "bin" / "quantize",
        llama_cpp / "build" / "bin" / "Release" / "quantize",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def build_commands(version: str) -> tuple[list[str], list[str], Path, Path]:
    merged_dir = get_merged_dir()
    suffix = _path_suffix(version)
    out_f16 = PROJECT_ROOT / "models" / f"{MODEL_STEM}{suffix}-f16.gguf"
    out_q4 = PROJECT_ROOT / "models" / f"{MODEL_STEM}{suffix}-q4.gguf"

    llama_cpp = _llama_cpp_dir()
    conv = _find_convert_script(llama_cpp)
    quant = _find_quantize_exe(llama_cpp)

    conv_cmd = [
        sys.executable or "python",
        str(conv or (llama_cpp / "convert-hf-to-gguf.py")),
        str(merged_dir),
        "--outfile",
        str(out_f16),
    ]
    quant_cmd = [
        str(quant or (llama_cpp / "build" / "bin" / ("llama-quantize.exe" if os.name == "nt" else "llama-quantize"))),
        str(out_f16),
        str(out_q4),
        "Q4_K_M",
    ]
    return conv_cmd, quant_cmd, out_f16, out_q4


def _print_cmd(cmd: list[str]) -> str:
    # Basic quoting for spaces
    parts = []
    for p in cmd:
        if " " in p or "\t" in p:
            parts.append(f"\"{p}\"")
        else:
            parts.append(p)
    return " ".join(parts)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true", help="Execute convert + quantize (requires llama.cpp built).")
    args = ap.parse_args()

    version = get_model_version()
    merged_dir = get_merged_dir()
    if not merged_dir.exists():
        raise SystemExit(f"Merged model directory not found: {merged_dir}\nRun: python merge_llama32_lora.py")

    conv_cmd, quant_cmd, out_f16, out_q4 = build_commands(version)

    print(f"Model version: {version}")
    print(f"Merged HF dir: {merged_dir}")
    print(f"Output f16:    {out_f16}")
    print(f"Output Q4:     {out_q4}")
    print()
    print("Commands:")
    print("  1) " + _print_cmd(conv_cmd))
    print("  2) " + _print_cmd(quant_cmd))

    if not args.run:
        print("\nTip: run with --run to execute these commands automatically.")
        return

    # convert_hf_to_gguf.py imports transformers. Fail fast with a clear message.
    try:
        import transformers  # noqa: F401
    except Exception:
        raise SystemExit(
            "Cannot --run because Python package 'transformers' is not installed in this environment.\n"
            "Activate the same venv you used for training (or install it), then retry.\n\n"
            "Install command (venv):\n"
            "  pip install transformers sentencepiece safetensors\n"
        )

    llama_cpp = _llama_cpp_dir()
    conv_script = _find_convert_script(llama_cpp)
    quant_exe = _find_quantize_exe(llama_cpp)
    if not llama_cpp.exists() or conv_script is None or quant_exe is None:
        raise SystemExit(
            "Cannot --run because llama.cpp conversion tools were not found.\n"
            f"- expected llama.cpp dir at: {llama_cpp}\n"
            f"- convert script found: {conv_script}\n"
            f"- quantize exe found: {quant_exe}\n"
            "Run without --run to just print the commands."
        )

    print("\nRunning conversion (HF -> f16 GGUF)...")
    subprocess.run(conv_cmd, check=True)
    print("Running quantization (f16 -> Q4_K_M GGUF)...")
    subprocess.run(quant_cmd, check=True)
    print("\nDone.")
    print(f"Versioned GGUF written to: {out_q4}")


if __name__ == "__main__":
    main()

