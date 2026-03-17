#!/usr/bin/env python3
"""
Increment the model version for the next fine-tune.

Reads model_version.txt (e.g. v1), writes the next version (e.g. v2).
Run this before re-training after preprocessing or data changes so new
artifacts use the new version (e.g. models/llama32-1b-sherlock-v2-lora).
"""
from pathlib import Path
import re

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = PROJECT_ROOT / "model_version.txt"


def main() -> None:
    if VERSION_FILE.exists():
        raw = VERSION_FILE.read_text(encoding="utf-8").strip()
        m = re.match(r"^v(\d+)$", raw)
        if m:
            next_num = int(m.group(1)) + 1
        else:
            next_num = 2
    else:
        next_num = 2
    next_version = f"v{next_num}"
    VERSION_FILE.write_text(next_version + "\n", encoding="utf-8")
    print(f"Bumped model version to {next_version}")
    print(f"  Next training/merge will use: llama32-1b-sherlock-{next_version}-*")
    print(f"  Version file: {VERSION_FILE}")


if __name__ == "__main__":
    main()
