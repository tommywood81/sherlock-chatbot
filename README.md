# sherlock-chatbot

Fine-tuned Sherlock Holmes conversational model for 4 GB CPU droplet deployment.

---

## Quick Start

```powershell
# Activate venv (PowerShell)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1

# Run QLoRA fine-tuning (requires GPU)
python train_llama32_1b_qlora.py
```

---

## Pipeline Overview

| Stage | Script / Command | Output |
|-------|------------------|--------|
| 1. Pairs | `python training/collect_pairs.py` | `data/pairs/*.md` |
| 2. JSONL | `python training/build_dataset.py` | `data/processed/train.jsonl` |
| 3. QLoRA | `python train_llama32_1b_qlora.py` | `models/llama32-1b-sherlock-lora/` |
| 4. Merge | Merge script (see below) | `models/llama32-1b-sherlock-merged/` |
| 5. GGUF | `llama.cpp` convert + quantize | `models/*.gguf` |

---

## Base Model

- **Model**: Llama 3.2 1B Instruct
- **Local path**: `models/Llama-3.2-1b-Instruct/` (HF format, downloaded manually)
- **Purpose**: Convertible to GGUF for 4 GB CPU droplet; good reasoning at ~1B params

---

## QLoRA Training Configuration

Used in `train_llama32_1b_qlora.py`:

| Setting | Value |
|---------|-------|
| LoRA r | 32 |
| LoRA alpha | 64 |
| LoRA dropout | 0.05 |
| Target modules | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Batch size | 2 |
| Gradient accumulation | 8 |
| Learning rate | 2e-4 |
| Epochs | 3 |
| Warmup ratio | 0.05 |
| LR scheduler | cosine |
| Weight decay | 0.01 |
| Max sequence length | 2048 |
| Precision | bf16 |
| Quantization | 4-bit NF4 (QLoRA) |

- **Dataset**: `data/processed/train.jsonl` (field `text`, ~3745 examples)
- **Script fails if no GPU** (explicit CUDA check)

---

## Latest Training Results

From a full 3-epoch QLoRA run on Llama 3.2 1B Instruct:

| Metric | Value |
|--------|-------|
| Final step loss | ~0.26–0.30 |
| mean_token_accuracy | ~93% |
| grad_norm | ~0.08–0.09 |
| train_loss (avg) | 0.4567 |
| Runtime | ~58 min (705 steps) |
| Samples/sec | ~3.2 |

Training showed stable loss and token accuracy; no signs of overfitting.

---

## After Training: Commands That Worked

All commands below were run successfully after the QLoRA fine-tuning pipeline.

### 1. Merge LoRA into base (HF format)

From project root with venv active:

```powershell
python merge_llama32_lora.py
```

- **Reads:** `models/Llama-3.2-1b-Instruct`, `models/llama32-1b-sherlock-lora`
- **Writes:** `models/llama32-1b-sherlock-merged/`

---

### 2. Build llama.cpp (Windows, one-time)

Use **Command Prompt** (cmd), not PowerShell. Run each command separately:

```cmd
"C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=amd64
```

```cmd
cd /d F:\Projects\sherlock-chatbot\llama.cpp
```

```cmd
cmake -S . -B build
```

```cmd
cmake --build build --config Release
```

- Requires **Visual Studio Build Tools** with **Desktop development with C++**.
- If your VsDevCmd path differs, search for `VsDevCmd.bat` under `C:\Program Files*`.

---

### 3. Convert merged model to GGUF (f16)

From `llama.cpp` directory (any shell):

```cmd
python convert_hf_to_gguf.py "F:/Projects/sherlock-chatbot/models/llama32-1b-sherlock-merged" --outfile "F:/Projects/sherlock-chatbot/models/llama32-1b-sherlock-f16.gguf"
```

---

### 4. Quantize to Q4_K_M

From `llama.cpp` directory in **Command Prompt** (same window as step 2, or run VsDevCmd again if needed):

```cmd
build\bin\llama-quantize.exe "F:/Projects/sherlock-chatbot/models/llama32-1b-sherlock-f16.gguf" "F:/Projects/sherlock-chatbot/models/llama32-1b-sherlock-q4.gguf" Q4_K_M
```

- **Note:** The executable is `llama-quantize.exe` in `build\bin\`, not `build\bin\Release\quantize.exe`.
- Result: ~763 MiB Q4 GGUF (suitable for 4 GB droplet).

---

### 5. Quick local test

From `llama.cpp`:

```cmd
build\bin\llama-cli.exe -m "F:/Projects/sherlock-chatbot/models/llama32-1b-sherlock-q4.gguf" -c 2048 -p "You are Sherlock Holmes. Watson: Holmes, how did you know the visitor was a sailor? Holmes:"
```

---

### Deploy on 4 GB CPU droplet

- Copy `llama32-1b-sherlock-q4.gguf` and `llama-server` (or `llama-cli`) to the server.
- Run with context 2048, threads 1; use a Sherlock system prompt for the server.

---

## Holdout Data

- `data/test/The_Field_Bazaar.txt`
- `data/test/How_Watson_Learned_the_Trick.txt`

Used for evaluation only; excluded from training.

---

## Project Structure

```
data/
  raw/          # Source novels (Gutenberg)
  pairs/        # Instruction–response pairs (.md)
  processed/    # train.jsonl
  test/         # Holdout stories
models/
  Llama-3.2-1b-Instruct/   # Base model (HF)
  llama32-1b-sherlock-lora/ # LoRA adapter
training/       # collect_pairs, build_dataset, train_lora, merge_lora
train_llama32_1b_qlora.py  # Main QLoRA script
```
