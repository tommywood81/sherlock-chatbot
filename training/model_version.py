"""
Single source of truth for Sherlock model versioning.

The version is read from model_version.txt at project root. Use it for:
- Training output dirs (LoRA, merged, GGUF) so each fine-tune produces versioned artifacts.
- Backend/eval default model path (optional).

v1 = no suffix in paths (backward compatible with existing llama32-1b-sherlock-*).
v2+ = suffix -v2, -v3 in paths (e.g. llama32-1b-sherlock-v2-lora).

Before re-fine-tuning after preprocessing changes, run:
  python scripts/bump_model_version.py
Then run training and merge; new artifacts will use the incremented version.
"""
from pathlib import Path
import re

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = PROJECT_ROOT / "model_version.txt"
MODEL_STEM = "llama32-1b-sherlock"


def get_model_version() -> str:
    """Read version from model_version.txt; default v1 if missing or invalid."""
    if not VERSION_FILE.exists():
        return "v1"
    raw = VERSION_FILE.read_text(encoding="utf-8").strip()
    if re.match(r"^v\d+$", raw):
        return raw
    return "v1"


def _path_suffix() -> str:
    """Version suffix for directory/file names: '' for v1, '-v2' for v2, etc."""
    v = get_model_version()
    if v == "v1":
        return ""
    return f"-{v}"


def get_lora_dir() -> Path:
    """LoRA adapter output directory (training script)."""
    return PROJECT_ROOT / "models" / f"{MODEL_STEM}{_path_suffix()}-lora"


def get_merged_dir() -> Path:
    """Merged model output directory (merge script)."""
    return PROJECT_ROOT / "models" / f"{MODEL_STEM}{_path_suffix()}-merged"


def get_gguf_q4_path() -> Path:
    """Default GGUF Q4_K_M path (after convert + quantize)."""
    return PROJECT_ROOT / "models" / f"{MODEL_STEM}{_path_suffix()}-q4.gguf"


# Convenience for imports
MODEL_VERSION = get_model_version()
