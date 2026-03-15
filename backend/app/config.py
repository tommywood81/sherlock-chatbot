"""
Application configuration via environment variables.
"""
import os
from pathlib import Path

# Model
MODEL_PATH = Path(os.getenv("MODEL_PATH", "models/llama32-1b-sherlock-q4.gguf"))
N_CTX = int(os.getenv("N_CTX", "2048"))
N_THREADS = int(os.getenv("N_THREADS", "0"))  # 0 = use all CPU cores
N_GPU_LAYERS = int(os.getenv("N_GPU_LAYERS", "0"))

# Inference defaults
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "256"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.7"))

# Paths relative to project root (backend may run from repo root in Docker)
PROJECT_ROOT = Path(os.getenv("PROJECT_ROOT", ".")).resolve()
RESULTS_PATH = PROJECT_ROOT / "results" / "results.json"

# Server
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
