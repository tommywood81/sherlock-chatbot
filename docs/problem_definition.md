# Sherlock Holmes Language Model — Problem Definition

## Project Objective

Build a production-style Sherlock Holmes language model system that responds with calm, precise deductive reasoning in the voice of Arthur Conan Doyle's consulting detective. The system must support dataset generation from canonical novels, LoRA fine-tuning of a small base model, quantization for CPU deployment, and a served inference API with a static web frontend. The end goal is a single deployable artifact (GGUF model ≤3GB) running on a CPU-only DigitalOcean droplet (4GB RAM, Ubuntu) via llama.cpp, with no GPU required.

## Dataset Description

### Dataset Source

All Sherlock Holmes novels by Arthur Conan Doyle are located in the project under `data/raw/`. These are Project Gutenberg text files for the canonical collections (for example: *A Study in Scarlet*, *The Sign of the Four*, *The Hound of the Baskervilles*, *The Adventures of Sherlock Holmes*, *His Last Bow*, and others). Example file paths:

- `data/raw/a_study_in_scarlet.txt`
- `data/raw/the_sign_of_the_four.txt`
- `data/raw/hound_of_the_baskervilles.txt`

These filenames represent the logical dataset targets; in practice the repository may store them with full Project Gutenberg titles, but they are treated equivalently by the pipeline.

### Training Pairs

Each novel is used to generate approximately 300 instruction–response pairs in Markdown, for a total corpus of roughly 900–1500 pairs across all books.

- **Output directory**: `data/pairs/`
- **File format**: `.md` (Markdown)

Every pair follows the exact structure:

```text
### System
You are Sherlock Holmes, the consulting detective of Baker Street.
You respond with calm, precise deductive reasoning.
Explain clues before conclusions.
Your tone is analytical, Victorian, and confident.

### Instruction
<user question or Watson dialogue>

### Response
<Sherlock Holmes style answer>
```

### Pair Types and Distribution

The dataset is a mixture of three pair types:

- **70% Deduction reasoning pairs**
  - Generated from descriptive passages containing clues, observations, or actions.
  - Instruction is an observation or question derived from the passage.
  - Response is a Holmes-style explanation that references concrete evidence before conclusions.

- **20% Holmes–Watson dialogue pairs**
  - Instruction includes a dialogue cue such as `Watson asks: "..."` or `Holmes observes: "..."`.
  - Response is Holmes’ analytical reply in Victorian style.
  - Dialogues are kept short and focused: one Watson question → one Holmes answer per pair.

- **10% Reasoning correction pairs**
  - Instruction presents a flawed deduction or overconfident assumption.
  - Response explains why the reasoning is unsound and walks through a corrected line of logic.

### Dataset Generation Strategy

1. Load paragraphs from each novel in `data/raw/` after removing Project Gutenberg boilerplate.
2. **Deduction pairs**:
   - Identify passages rich in clues, observations, or actions.
   - Convert each passage into an instruction asking Holmes to deduce or explain something.
   - Generate a Holmes-style response grounded in the passage, explicitly referencing the observed details.
3. **Dialogue pairs**:
   - Identify passages with character interaction (Holmes, Watson, clients, inspectors).
   - Construct Watson question / Holmes reply pairs, using the original dialogue as evidence and adding concise reasoning.
4. **Reasoning correction pairs**:
   - Introduce simple flawed reasoning patterns (e.g. hasty generalizations based on a single cue).
   - Provide Holmes-style corrections that emphasise evidence, alternative hypotheses, and the separation of observation from inference.
5. Ensure every example includes the **System** block for persona anchoring.
6. Save all pairs as Markdown in `data/pairs/` using the exact format above.

### Cleaning and Preprocessing Overview

Cleaning and preprocessing are handled in the pipeline before training:

1. Remove:
   - Project Gutenberg headers and footers.
   - Copyright notices.
   - Chapter numbers and obvious table-of-contents blocks.
   - Blank or empty paragraphs.
2. Normalize:
   - Whitespace (collapse runs of spaces, trim lines).
   - Punctuation where necessary.
3. Reject or repair pairs where:
   - Response length is shorter than 30 characters, or
   - Content is clearly boilerplate (e.g. pure headings with no narrative content).
4. Optionally:
   - Tokenize with the model tokenizer to inspect sequence lengths.
   - Remove duplicated or near-duplicated pairs.

## Training Approach

Fine-tuning uses **LoRA** (Low-Rank Adaptation) on the base model **TinyLlama/TinyLlama-1.1B-Chat-v1.0**, with libraries: `transformers`, `peft`, `datasets`, `trl`, `accelerate`, `sentencepiece`, and `bitsandbytes`. LoRA is configured with rank 8, alpha 16, dropout 0.05; training runs for 3 epochs with batch size 2 and learning rate 2e-4. The LoRA adapter is saved to `models/lora/`. After training, the adapter is merged with the base model, converted to GGUF, and quantized to **Q4_K_M**. The final artifact is `models/sherlock-q4.gguf`, kept under 3GB. Python 3.10 and pytest are used for implementation and tests.

## Deployment Constraints

Deployment target is a **DigitalOcean droplet**: 4GB RAM, CPU only, Ubuntu Linux. Inference must run without a GPU using **llama.cpp** and the GGUF model. The model file must be ≤3GB and quantized as Q4_K_M. The backend follows a layered ML serving architecture: static frontend → FastAPI (GET /health, POST /ask) → InferenceService → LlamaRuntime → GGUF model. All paths and configuration must be externalized; no hardcoded production paths or secrets in code.
