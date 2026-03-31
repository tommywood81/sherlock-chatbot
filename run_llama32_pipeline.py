#!/usr/bin/env python3
"""
Root-level entrypoint for the Llama 3.2 1B QLoRA pipeline.

Run:
  python run_llama32_pipeline.py --bump-version

Implementation lives in scripts/run_llama32_pipeline.py so we can keep scripts grouped.
"""

from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.run_llama32_pipeline import main  # noqa: E402


if __name__ == "__main__":
    main()

