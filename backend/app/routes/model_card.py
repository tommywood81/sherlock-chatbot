"""
GET /api/model-card — return model card metadata for OpenAI-style report.
"""
import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import RESULTS_PATH, PROJECT_ROOT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["model-card"])

CAPABILITY_MAP = {
    "memorisation": "Character Consistency",
    "generalisation": "Deductive Reasoning",
    "style": "Dialogue Interaction",
    "capability_retention": "Out-of-Scope Handling",
}


def _resolve_results_path() -> Path:
    p = RESULTS_PATH
    if not p.is_absolute():
        p = PROJECT_ROOT / p
    return p.resolve()


def _build_model_card(data: dict[str, Any]) -> dict[str, Any]:
    """Build model card payload from evaluation results."""
    by_cat = data.get("by_category", {})
    capabilities = []
    for bench_cat, name in CAPABILITY_MAP.items():
        stats = by_cat.get(bench_cat, {})
        capabilities.append({
            "name": name,
            "total": stats.get("total", 0),
            "passed": stats.get("passed", 0),
            "pass_rate": stats.get("pass_rate", 0.0),
        })
    return {
        "model_overview": {
            "base_model": "Llama 3.2 1B Instruct",
            "fine_tuning": "QLoRA (r=32, 4-bit NF4)",
            "training_data": "~3.7k Sherlock-style pairs",
            "quantization": "Q4_K_M (GGUF)",
            "inference": "llama.cpp (CPU)",
            "ram_target": "~2 GB",
            "target_deployment": "4 GB CPU droplet",
        },
        "evaluation_methodology": (
            "Task-specific prompts in four areas (memorisation, generalisation, "
            "style, capability_retention). Pass/fail by keyword match, then aggregated."
        ),
        "benchmark_results": {
            "total_tests": data.get("total_tests", 0),
            "passed": data.get("passed", 0),
            "pass_rate": data.get("pass_rate", 0.0),
            "avg_response_time_s": data.get("avg_response_time_s", 0.0),
            "capabilities": capabilities,
        },
        "limitations": [
            "Q4 quantization trades some nuance for deployability.",
            "1B parameters: strong character or strong general knowledge, hard to get both.",
            "Some responses can be short or truncated.",
        ],
        "intended_use": (
            "Sherlock Holmes-style conversational assistant and deductive reasoning "
            "demonstration, suitable for low-resource CPU deployment."
        ),
    }


@router.get("/model-card")
def get_model_card():
    """Return model card metadata derived from evaluation results."""
    path = _resolve_results_path()
    if not path.exists():
        return _build_model_card({})
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return _build_model_card(data)
    except (json.JSONDecodeError, OSError) as e:
        logger.exception("Failed to load results for model card: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load model card data")
