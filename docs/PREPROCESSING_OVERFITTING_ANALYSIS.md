# Preprocessing overfitting analysis

## Summary

The model overfits to the phrase *"From this we may deduce that the clue in question—…—provides concrete evidence. The matter becomes clear when we observe what it implies: habits, recent movements, or character."* because **training samples are generated from a small set of rigid templates** in `training/collect_pairs.py`. Only a short middle segment (the "clue") varies; the rest is identical across hundreds of examples. Stage 3 (`training/build_dataset.py`) then **filters in** only responses that start with those same phrases, reinforcing the overfitting.

---

## Pipeline and categories

| Stage | Script | Role |
|-------|--------|------|
| 2 | `training/collect_pairs.py` | Generates instruction–response pairs from raw text; writes `data/pairs/*.md`. |
| 3 | `training/build_dataset.py` | Converts pairs to `data/processed/train.jsonl` (Llama chat format); applies length and "Holmes" filter. |

**Pair types** (from `collect_pairs.py`):

- **Deduction** (~40%): "What can Holmes deduce from…?" → single rigid response template.
- **Watson** (~30%): "Watson asks: Holmes, how do you explain this: …" → single rigid response template.
- **Correction** (~20%): "A detective claims … Is this sound reasoning?" → **identical** response for every pair (no passage-dependent content).

**General / identity** (added in Stage 3): `build_dataset.py` appends ~10% identity pairs (Who are you?, Describe your method?, How do you approach a new case?) with three fixed responses. These are short and varied and are not the main overfitting source.

---

## Why it overfits: category-by-category

### 1. Deduction (reasoning) samples

**Generator:** `_deduction_response(passage)` in `collect_pairs.py`.

**Template (unchanged for every deduction pair):**

```
From this we may deduce that the clue in question—<CLUE>—provides concrete evidence.
The matter becomes clear when we observe what it implies: habits, recent movements, or character.
The conclusion follows when one considers what such a detail would mean to a trained observer.
```

- **What varies:** Only `<CLUE>` (up to 70 chars from the passage via `_extract_clue_phrase`).
- **What is fixed:** The entire opening, the sentence about "habits, recent movements, or character", and the closing sentence.

So across ~40% of the dataset, the model sees the same opening and closing hundreds of times. It learns to emit that boilerplate and only "fill in" the middle, which leads to the exact overfitted phrase at inference.

### 2. Watson (chat/dialogue) samples

**Generator:** `_watson_response(passage)`.

**Template:**

```
"My dear Watson," I replied, "the point turns on a single observation. Here we have <CLUE>.
The inference is unavoidable: from that we may deduce the rest—provided we do not leap ahead of the evidence."
```

- **What varies:** Only `<CLUE>` (up to 60 chars).
- **What is fixed:** "The inference is unavoidable: from that we may deduce the rest—provided we do not leap ahead of the evidence" appears in every Watson response.

So again the model sees one phrase repeatedly and learns to repeat it.

### 3. Correction (reasoning-correction) samples

**Generator:** `_correction_response(passage)`.

**Template:** **Fully fixed.** No use of the passage in the response.

```
The matter becomes clear when we observe the error: it is unsound to rest a conclusion upon a solitary impression.
Observation gives us facts; inference must allow for alternative explanations and require corroboration.
From this we may deduce that one may entertain several hypotheses; none amounts to proof without further evidence.
```

- **What varies:** Nothing. Every correction pair has this exact response.
- So the model sees this block verbatim once per correction pair (~20% of data), reinforcing "The matter becomes clear when we observe" and "From this we may deduce".

### 4. General knowledge / identity

**Source:** `build_dataset.run()` appends identity pairs (Who are you?, method, approach) with three fixed responses. These are diverse and short; they are not the cause of the "clue in question" overfitting but do add some repetition.

---

## Stage 3 filter: reinforcing overfitting

In `build_dataset.py`, `_looks_like_holmes_response(resp)` is used to **drop** any response that does not match:

- `"my dear watson" in lower`, or  
- `lower.startswith("from this we may deduce")`, or  
- `lower.startswith("the matter becomes clear when we observe")`, or  
- `lower.startswith('"my dear watson"')`, or  
- `" i " in lower`

So we **explicitly keep** only responses that start with the overfitted phrases (or contain " I ") and drop other valid Holmes-like answers. That further concentrates the training signal on those openings.

---

## Recommended preprocessing changes

### 1. `training/collect_pairs.py`: diversify response templates

- **Deduction:** Define several alternative openings and closings (e.g. "It follows that…", "One may infer…", "The observation suggests…", "What we have here points to…") and **randomly choose** one per pair. Vary the middle sentence too (e.g. "habits and recent movements" vs "character and circumstance" vs "means and opportunity"). Avoid a single boilerplate that repeats in every deduction.
- **Watson:** Same idea: multiple possible replies (different openings, different reasoning phrases). Do not use "from that we may deduce the rest—provided we do not leap ahead of the evidence" in every Watson response.
- **Correction:** Use **several** different correction responses (3–5 variants) and choose at random so the model does not see one identical block hundreds of times.
- **Remove or repurpose** the unused `REASONING_PHRASES` list so it is not the only source of phrasing; use it only as a pool to sample from, not as a requirement that forces one phrase.

### 2. `training/build_dataset.py`: relax the Holmes filter

- **Do not require** responses to start with "from this we may deduce" or "the matter becomes clear when we observe". Broaden the heuristic to any Holmes-like signal (e.g. first-person, "observe"/"evidence"/"infer", or drop the filter and rely on Stage 2 quality). That allows Stage 2 to add varied templates without Stage 3 filtering them out.

### 3. Optional: light augmentation in Stage 3

- Slight paraphrasing or template substitution at build time could increase variety further; only if needed after (1) and (2).

---

## Implementation status

- **Report:** This document.
- **Code:**
  - `collect_pairs.py`: Multiple response templates per type (deduction, Watson, correction); random choice per pair so the same boilerplate is not repeated. Removed the single "From this we may deduce that the clue in question—…—provides concrete evidence" template.
  - `build_dataset.py`: `_looks_like_holmes_response` relaxed to accept any response containing Holmes-style signals (observe, infer, evidence, conclusion, etc.) instead of requiring the overfitted opening phrases.
  - `tests/test_pair_generation.py`: `REASONING_PHRASE_PATTERNS` broadened so responses need only contain one of several reasoning-style phrases (e.g. "observe", "infer", "evidence") rather than the four fixed phrases.

After regenerating pairs and `train.jsonl`, re-fine-tune (e.g. bump model version, train, merge, convert to GGUF) to obtain a model that no longer defaults to the single overfitted phrase.
