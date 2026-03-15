"""
Load and hold the GGUF model once at startup. Reuse for every inference request.
"""
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Optional

from .config import MODEL_PATH, N_CTX, N_GPU_LAYERS, N_THREADS, PROJECT_ROOT

if TYPE_CHECKING:
    from llama_cpp import Llama

logger = logging.getLogger(__name__)

_model: Optional["Llama"] = None


def _resolve_model_path() -> Path:
    p = Path(MODEL_PATH)
    if not p.is_absolute():
        p = PROJECT_ROOT / p
    return p.resolve()


def load_model() -> "Llama":
    """Load the GGUF model once. Idempotent."""
    global _model
    if _model is not None:
        return _model
    try:
        from llama_cpp import Llama  # noqa: F811
    except ImportError as e:
        raise RuntimeError(
            "llama-cpp-python is required. Install with: pip install llama-cpp-python"
        ) from e
    path = _resolve_model_path()
    if not path.exists():
        raise FileNotFoundError(f"Model not found: {path}")
    logger.info("Loading model from %s (n_ctx=%s, n_threads=%s)", path, N_CTX, N_THREADS or "auto")
    _model = Llama(
        model_path=str(path),
        n_ctx=N_CTX,
        n_threads=N_THREADS or None,  # None = use all cores
        n_gpu_layers=N_GPU_LAYERS,
        verbose=False,
    )
    logger.info("Model loaded successfully")
    return _model


def get_model() -> "Llama":
    """Return the global model instance. Call load_model() at startup first."""
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() at application startup.")
    return _model
