"""
GET /api/evaluation — return evaluation results from results/results.json.
"""
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..config import RESULTS_PATH, PROJECT_ROOT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["evaluation"])


def _resolve_results_path() -> Path:
    p = RESULTS_PATH
    if not p.is_absolute():
        p = PROJECT_ROOT / p
    return p.resolve()


@router.get("/evaluation")
def get_evaluation():
    """Return evaluation results JSON. Empty structure if file missing."""
    path = _resolve_results_path()
    if not path.exists():
        logger.warning("Evaluation results not found at %s", path)
        return JSONResponse(
            content={
                "total_tests": 0,
                "passed": 0,
                "pass_rate": 0.0,
                "by_category": {},
                "results": [],
            }
        )
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data
    except (json.JSONDecodeError, OSError) as e:
        logger.exception("Failed to load evaluation results: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load evaluation results")
