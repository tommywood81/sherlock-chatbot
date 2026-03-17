# Model versioning

The pipeline versions Sherlock model artifacts so you can re-fine-tune (e.g. after changing preprocessing) without overwriting the current model.

## Where versioning applies

| Stage | First place version is used | Output (v1) | Output (v2+) |
|-------|-----------------------------|------------|--------------|
| Training | `train_llama32_1b_qlora.py` | `models/llama32-1b-sherlock-lora` | `models/llama32-1b-sherlock-v2-lora` |
| Merge | `merge_llama32_lora.py` | `models/llama32-1b-sherlock-merged` | `models/llama32-1b-sherlock-v2-merged` |
| Convert to GGUF | Manual / scripts | `models/llama32-1b-sherlock-q4.gguf` | `models/llama32-1b-sherlock-v2-q4.gguf` |
| Backend / eval | `MODEL_PATH` env or default | (default path above) | Set `MODEL_PATH` to the new .gguf |

- **v1** uses no suffix in paths (backward compatible with existing artifacts).
- **v2, v3, ...** use `-v2`, `-v3` in paths.

The version is read from **`model_version.txt`** at the project root (single line, e.g. `v1` or `v2`). All versioned paths are defined in **`training/model_version.py`**.

## Workflow: re-fine-tune a new version

1. **Adjust preprocessing** and regenerate data (e.g. `data/processed/train.jsonl`).
2. **Bump the version** so the next training run writes v2 (or v3, …) artifacts:
   ```bash
   python scripts/bump_model_version.py
   ```
3. **Train** (output goes to the versioned LoRA dir):
   ```bash
   python train_llama32_1b_qlora.py
   ```
4. **Merge** (output goes to the versioned merged dir):
   ```bash
   python merge_llama32_lora.py
   ```
5. **Convert to GGUF** (e.g. llama.cpp `convert-hf-to-gguf.py` then `quantize`) and save as  
   `models/llama32-1b-sherlock-<version>-q4.gguf`.
6. **Use the new model**: set `MODEL_PATH` to that file (e.g. in `docker-compose.yml` or when running the backend locally).

## Files

- **`model_version.txt`** – current version (commit this so the next train uses the right paths).
- **`training/model_version.py`** – reads the version and exposes `get_lora_dir()`, `get_merged_dir()`, `get_gguf_q4_path()`.
- **`scripts/bump_model_version.py`** – increments the version in `model_version.txt` (e.g. v1 → v2).
