## Sherlock Holmes 1.1B LoRA tuning notes

### Goals

- **Character**: strong, consistent Sherlock Holmes voice.
- **Clarity**: concise conversational replies instead of long narration.
- **Reasoning**: visible, stepwise deductions grounded in clues.
- **Stability**: small model (≈1.1B) that trains reliably and runs on a 4 GB CPU after GGUF quantization.

### Stage 2 – Pair generation (`training/collect_pairs.py`)

- Keeps using raw Conan Doyle texts from `data/raw/`, stripping Gutenberg boilerplate, TOC, and weak narrative.
- Pair types and approximate ratios:
  - **40% direct Q&A** – “What can Holmes deduce from the following observation…”
  - **30% Watson / Holmes dialogue** – `Watson asks: "Holmes, how do you explain this: …"` with `"My dear Watson"` replies.
  - **20% reasoning-correction** – flawed deductions corrected by Holmes.
- Additional length-based filters:
  - Drops pairs whose instruction is excessively long (heuristic: >260 chars).
  - Drops responses that are too short or too long for a small model (heuristic: `< MIN_RESPONSE_LEN` or `> 800` chars).
  - Logs how many pairs were dropped as too short / too long per run.

These changes bias the dataset toward compact, conversational exchanges that are easier for a 1.1B model to master while preserving Victorian wording.

### Stage 3 – JSONL build and validation (`training/build_dataset.py`)

- Parses `data/pairs/*.md` into `Pair(system, instruction, response)` and applies quality checks:
  - **No empty instruction/response**.
  - **Response length band** suited to a small model (~40–150 tokens, approximated as 120–900 characters).
  - **Holmes as speaker**:
    - Filters out responses that look like Watson or pure third-person narration.
    - Keeps responses that match common Holmes patterns (e.g. “My dear Watson…”, “From this we may deduce…”, “The matter becomes clear when we observe…”).
- Logs counts of dropped samples (empty, length, non-Holmes speaker) so low-quality items can be inspected later.
- After building from pairs, injects a small set of **identity/personality anchors** (~10% of final dataset), for example:
  - “Who are you?” → “I am Sherlock Holmes, consulting detective of Baker Street…”
  - “Describe your method of deduction.” → canonical deduction description.

The result is a JSONL dataset with:

- Stable formatting suitable for chat-style fine-tuning.
- Responses that almost always sound like Holmes speaking.
- Extra density of character-anchoring examples without inflating dataset size excessively.

### Stage 4 – LoRA configuration for TinyLlama 1.1B (`training/train_lora.py`)

LoRA and training settings are tuned for a 1.1B base model:

- **LoRA**:
  - `r = 16`, `alpha = 32`, `dropout = 0.05`.
  - Applied via `peft` on TinyLlama-1.1B-Chat.
- **Training hyperparameters**:
  - `epochs = 4` (balance between learning depth and overfitting).
  - `batch_size = 2`, `grad_accum_steps = 4` (effective batch 8, small-ram friendly).
  - `learning_rate = 2e-4`, `warmup_ratio = 0.03`, `weight_decay = 0.01`.
  - `max_seq_length = 1024` to accommodate full chat turns while staying within TinyLlama’s comfort zone.
- **Overfitting prevention**:
  - Dataset split into **90% train / 10% validation** using `train_test_split(seed=42)`.
  - `evaluation_strategy="steps"`, `eval_steps=100`, `save_strategy="steps"`.
  - `load_best_model_at_end=True` with `metric_for_best_model="eval_loss"`.
  - `EarlyStoppingCallback(early_stopping_patience=2)` to stop if validation loss deteriorates.
- **Loss masking**:
  - Only assistant tokens contribute to loss; system and user tokens are masked out to keep the model focused on Holmes’ side of the conversation.

These settings are designed to:

- Extract as much useful signal as possible from ~3k–3.5k high-quality examples.
- Keep training stable on modest hardware (single GPU or even CPU, at the cost of speed).
- Produce an adapter that, once merged and quantized (e.g. Q3_K_M or Q4_K_M), fits comfortably in **≤ 3 GB GGUF**, suitable for a 4 GB CPU droplet.

