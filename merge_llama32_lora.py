"""
Merge the Llama 3.2 1B Sherlock LoRA adapter into the base model.

Usage:
    python merge_llama32_lora.py

Output:
    models/llama32-1b-sherlock-merged/
"""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
BASE_DIR = PROJECT_ROOT / "models" / "Llama-3.2-1b-Instruct"
LORA_DIR = PROJECT_ROOT / "models" / "llama32-1b-sherlock-lora"
OUT_DIR = PROJECT_ROOT / "models" / "llama32-1b-sherlock-merged"


def merge() -> Path:
    """Merge LoRA into base model and save. Returns output directory."""
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    if not BASE_DIR.exists():
        raise FileNotFoundError(f"Base model not found: {BASE_DIR}")
    if not LORA_DIR.exists():
        raise FileNotFoundError(f"LoRA adapter not found: {LORA_DIR}")

    print("Loading base model...")
    base = AutoModelForCausalLM.from_pretrained(str(BASE_DIR), trust_remote_code=True)

    print("Loading LoRA adapter...")
    model = PeftModel.from_pretrained(base, str(LORA_DIR))

    print("Merging...")
    merged = model.merge_and_unload()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    merged.save_pretrained(str(OUT_DIR))
    AutoTokenizer.from_pretrained(str(BASE_DIR)).save_pretrained(str(OUT_DIR))

    print(f"Saved merged model to {OUT_DIR}")
    return OUT_DIR


if __name__ == "__main__":
    merge()
