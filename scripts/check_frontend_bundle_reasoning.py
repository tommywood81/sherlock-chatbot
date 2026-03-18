#!/usr/bin/env python3
"""
Sanity check: verify the *served* frontend bundle contains reasoning UI strings.

This helps determine whether the running dashboard is an older frontend build
that might not parse [REASONING]/[ANSWER].
"""

from __future__ import annotations

import re
import sys
from typing import Optional

import requests


BASE = "http://localhost:3000"


def _first_js_asset(html: str) -> Optional[str]:
    # Vite production HTML typically contains <script type="module" src="/assets/index-XXXX.js">
    m = re.search(r'src="(/assets/[^"]+\.js)"', html)
    return m.group(1) if m else None


def main() -> None:
    r = requests.get(f"{BASE}/", timeout=30)
    r.raise_for_status()
    html = r.text
    js_path = _first_js_asset(html)
    if not js_path:
        print("Could not find JS asset in frontend HTML.", file=sys.stderr)
        sys.exit(2)

    js_url = f"{BASE}{js_path}"
    js = requests.get(js_url, timeout=30).text

    checks = {
        "reasoning-panel-empty-msg": "No structured reasoning was provided" in js,
        "waiting-for-answer-msg": "Waiting for [ANSWER]" in js,
        "waiting-for-reasoning-msg": "Waiting for reasoning" in js,
        "reasoning-parser-marker": "[REASONING]" in js,
        "answer-parser-marker": "[ANSWER]" in js,
        "assistant-waiting-fallback": "[REASONING]" in js and "[ANSWER]" in js,
    }

    print(f"Frontend JS asset: {js_url}")
    for k, v in checks.items():
        print(f"{k}: {v}")

    if not checks["reasoning-parser-marker"] or not checks["reasoning-panel-empty-msg"]:
        print("WARNING: served bundle does not appear to include the expected reasoning UI/parsing code.")


if __name__ == "__main__":
    main()

