"""
Pytest configuration for backend tests.

Ensures `backend/` is on `sys.path` so imports like `from app.routes.infer ...`
work when running tests from `backend/tests/`.
"""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

