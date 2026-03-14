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

## After Training: Merge and GGUF

1. **Merge LoRA into base** (HF format):
   - Load base from `models/Llama-3.2-1b-Instruct`
   - Load LoRA from `models/llama32-1b-sherlock-lora`
   - Merge and save to `models/llama32-1b-sherlock-merged/`

2. **Convert to GGUF** (from `llama.cpp`):
   ```bash
   python convert_hf_to_gguf.py "path/to/llama32-1b-sherlock-merged" --outfile sherlock-f16.gguf
   ./quantize sherlock-f16.gguf sherlock-q4.gguf Q4_K_M
   ```

3. **Deploy** on 4 GB CPU droplet:
   - Use Q3_K_M or Q4_K_M for ~1.8–2 GB loaded RAM
   - Context 2048, threads 1

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
