# Sherlock Chatbot

## Overview

This is a portfolio ML systems project: a **Llama 3.2 1B Instruct** model fine-tuned with **QLoRA** to a Sherlock persona, then merged and quantized to **Q4_K_M GGUF** for low-cost CPU inference.

Goal: show the trade-off between efficiency and capability on small, compressed models.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI + `llama-cpp-python`
- **Training:** Hugging Face + PEFT (QLoRA)
- **Runtime format:** GGUF (4-bit quantised)
- **Deployment:** Docker Compose

## Repository Structure

- `frontend/` - UI and evaluation pages
- `backend/` - API and inference runtime
- `training/` - data prep + training helpers
- `models/` - base, adapter, merged, GGUF artifacts

## Quick Start (Docker)

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

Notes:
- Frontend proxies `/api` to backend.
- Place model files under `./models`.
- Update `MODEL_PATH` in `docker-compose.yml` if your GGUF name differs.

## Local Development

Backend:
```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Required backend env: `MODEL_PATH`, `PROJECT_ROOT`.

## Training Pipeline

End-to-end flow:

1. Collect training pairs
2. Build `train.jsonl`
3. Train QLoRA adapter
4. Merge adapter into base model
5. Convert merged model to GGUF (f16)
6. Quantize to Q4 (`Q4_K_M`)
7. Serve new GGUF in backend

### 1) Data Preparation

```bash
python training/collect_pairs.py
python training/build_dataset.py
```

Primary dataset: `data/processed/train.jsonl`

### 2) QLoRA Training (GPU)

```bash
python train_llama32_1b_qlora.py
```

Typical run settings in this project:
- LoRA `r=32`, `alpha=64`
- LR `2e-4`
- 3 epochs
- max length `2048`
- 4-bit NF4

### 3) Merge Adapter

```bash
python merge_llama32_lora.py
```

### 4) Build llama.cpp Tools (Static)

```bash
cd llama.cpp
cmake -B build -DBUILD_SHARED_LIBS=OFF -DLLAMA_OPENMP=OFF .
cmake --build build --config Release
```

### 5) Convert Merged HF -> GGUF (f16)

```bash
python convert_hf_to_gguf.py "../models/<merged-model-dir>" --outfile "../models/<name>-f16.gguf"
```

### 6) Quantize GGUF (f16 -> Q4_K_M)

```bash
build/bin/llama-quantize "../models/<name>-f16.gguf" "../models/<name>-q4.gguf" Q4_K_M
```

On Windows, this is typically `build\\bin\\llama-quantize.exe`.

### 7) Deploy New Artifact

Set new GGUF path in `MODEL_PATH`, then restart backend:

```bash
docker compose build --no-cache backend
docker compose up -d backend
```

## Model Convergence Notes

Training has been stable across runs (no divergence). Loss trends down, token accuracy lands in the low 90% range, and gradients stay well-behaved.

Representative 3-epoch run:
- Final step loss: ~`0.26-0.30`
- Mean token accuracy: ~`0.93`
- Runtime: ~`58 min` (hardware-dependent)

The shipped v6 run reports a higher aggregate train loss than earlier runs, but still converged cleanly. Practical takeaway: **the model converges; most behavior limits are from model size + aggressive quantization, not training instability**.

## Testing

```bash
pytest tests/test_sherlock_model.py -v -s
pytest tests/test_sherlock_model_extensive.py -v -s
pytest tests/test_sherlock_model_10_questions.py -v -s
```

## License

Use is subject to Meta Llama license terms for base weights, plus license terms of any third-party data used for training.
