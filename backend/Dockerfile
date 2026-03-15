# Backend: FastAPI + llama-cpp-python, model loaded at startup
FROM python:3.11-slim

WORKDIR /app

# Install build deps for llama-cpp-python (CPU only)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code; model and results are mounted in docker-compose
COPY app/ ./app/

# Default: expect MODEL_PATH at /app/models/... or set via env
ENV PROJECT_ROOT=/app
ENV MODEL_PATH=/app/models/llama32-1b-sherlock-q4.gguf

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
