# Sherlock chatbot

A small portfolio demo: **Llama 3.2 1B** fine-tuned with QLoRA for a Sherlock-style voice, served as a React + FastAPI app with a **4-bit GGUF** so it can run on a modest CPU box.

---

## Run it

```bash
docker compose up --build
```

Open **http://localhost:3000**. The frontend proxies `/api` to the backend; put your weights under `./models` and set `MODEL_PATH` in `docker-compose.yml` if the filename differs.

For local dev without Docker: backend (`uvicorn` from `backend/`, with `MODEL_PATH` and `PROJECT_ROOT` set), frontend (`npm run dev` in `frontend/` — Vite proxies `/api`).

---

## Training and fine-tuning

Data flows **pairs → JSONL → QLoRA → merge → GGUF**. Scripts live at the repo root and under `training/`; the main trainer is `train_llama32_1b_qlora.py` (expects a GPU).

**QLoRA settings** (see `train_llama32_1b_qlora.py` for the full list): LoRA r 32 / alpha 64, batch 2, grad accumulation 8, lr 2e-4, 3 epochs, cosine schedule, max length 2048, 4-bit NF4, bf16.

**Dataset:** `data/processed/train.jsonl` (instruction–response `text` field, on the order of ~3.7k examples).

### Log loss and convergence

On a full **3-epoch** QLoRA run on Llama 3.2 1B Instruct, training looked **stable**: loss and token accuracy moved smoothly, with **no clear sign of overfitting**.

| Metric | Typical range / value |
|--------|----------------------|
| Final step loss | ~0.26–0.30 |
| Train loss (epoch average) | ~0.457 |
| mean_token_accuracy | ~93% |
| grad_norm | ~0.08–0.09 |
| Throughput | ~3.2 samples/sec |
| Wall time | ~58 min (~705 steps) |

**Current shipped artifact (v6)** — merged + Q4 GGUF used in compose by default:

| | |
|--|--|
| `train_loss` | **0.5696** |
| `mean_token_accuracy` | **0.9096** |
| `train_runtime` | ~3420 s (~57 min) |
| `num_tokens` (train) | ~1.48M |

So: **convergence was steady**; v6’s reported `train_loss` is a bit higher than the earlier 3-epoch summary above because it reflects a different run/version and how Hugging Face aggregates loss — both runs remained well-behaved numerically (accuracy in the low 90s, no divergence).

---

## Pipeline (short)

| Step | Command | Output |
|------|---------|--------|
| Pairs | `python training/collect_pairs.py` | `data/pairs/*.md` |
| JSONL | `python training/build_dataset.py` | `data/processed/train.jsonl` |
| Train | `python train_llama32_1b_qlora.py` | versioned LoRA under `models/` |
| Merge | `python merge_llama32_lora.py` | merged HF weights |
| GGUF | `llama.cpp` convert + `Q4_K_M` quantize | `*.gguf` |

Version bumps and paths: `model_version.txt`, `scripts/bump_model_version.py`, and **`docs/MODEL_VERSIONING.md`** for the full workflow. One-shot wrapper: `python run_llama32_pipeline.py` (optional `--bump-version`).

**Base model:** Llama 3.2 1B Instruct (HF checkout under `models/`). **Holdouts** for eval only: `data/test/The_Field_Bazaar.txt`, `data/test/How_Watson_Learned_the_Trick.txt`.

---

## After training: merge, GGUF, and tests

### Merge LoRA into the base (HF)

From the project root, venv active:

```powershell
python merge_llama32_lora.py
```

Reads the base under `models/` and the LoRA adapter from the versioned path (see `training/model_version.py`). Writes merged weights to the matching `...-merged` directory.

### llama.cpp — use a **static** build (Windows)

For local pytest and scripted inference, build **static** binaries (`BUILD_SHARED_LIBS=OFF`). A shared build (exe + DLLs) is often flaky on Windows (missing `ggml_backend_init`, exit 130, etc.).

From the `llama.cpp` directory:

```powershell
cmake -B build -DBUILD_SHARED_LIBS=OFF -DLLAMA_OPENMP=OFF .
cmake --build build --config Release
```

Use the outputs under **`llama.cpp/build/bin/Release/`** (e.g. `llama-cli.exe`, `llama-server.exe`). The quantizer is typically under `build/bin/` as `llama-quantize.exe` — see your tree after build.

Prerequisites: Visual Studio C++ build tools or a Developer shell where `cmake` and the compiler are on `PATH`.

### Convert merged HF → f16 GGUF

From `llama.cpp` (adjust paths to your merged folder and output name):

```powershell
python convert_hf_to_gguf.py "../models/llama32-1b-sherlock-v6-merged" --outfile "../models/llama32-1b-sherlock-v6-f16.gguf"
```

### Quantize to Q4_K_M

From `llama.cpp`, using **Command Prompt** or the same dev environment as the build:

```cmd
build\bin\llama-quantize.exe "path\to\model-f16.gguf" "path\to\model-q4.gguf" Q4_K_M
```

You should end up with a few-hundred-MB file suitable for a small CPU droplet. Point **`MODEL_PATH`** in `docker-compose.yml` (or env) at that `.gguf`.

### Pytest (optional)

From project root, venv active, with static `llama.cpp` binaries and a Q4 GGUF in place (paths in test files or env):

```powershell
pytest tests/test_sherlock_model.py -v -s
pytest tests/test_sherlock_model_extensive.py -v -s
pytest tests/test_sherlock_model_10_questions.py -v -s
```

---

## License / usage

Follow Meta’s Llama license for the base weights and respect the terms of any third-party text you used to build the dataset.
