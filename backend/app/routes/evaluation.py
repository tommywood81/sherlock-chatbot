"""
GET /api/evaluation — aggregate runtime evaluation metrics across sessions.
"""
import logging
from typing import Iterable

from fastapi import APIRouter

from ..eval_runtime import aggregate_scores
from ..sessions import _sessions  # type: ignore[attr-defined]

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["evaluation"])


@router.get("/evaluation")
def get_evaluation():
    """
    Return aggregated evaluation metrics across all in-memory sessions.
    Compatible with the existing frontend EvaluationResult type.
    """
    # Import inside function to avoid circular imports at module import time.
    from ..sessions import SessionState, ScoreEntry

    all_scores: list[ScoreEntry] = []
    # _sessions is protected by a lock when mutated; a shallow iteration is fine here.
    for state in _sessions.values():  # type: ignore[attr-defined]
        if state.score_history:
            all_scores.extend(state.score_history)
    return aggregate_scores(all_scores)
