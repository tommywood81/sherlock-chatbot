"""
Simple sanity test: load the merged Sherlock model and check it produces output.

Run after the fine-tuning pipeline and merge step. Uses the merged HF model
(models/llama32-1b-sherlock-merged) with transformers. Does not require llama.cpp.

Uses the same Llama chat template as training (system / user / assistant) so
the model continues as Holmes instead of echoing the prompt.

Later: add tests that check generalization and run against test/holdout data.
"""
from pathlib import Path

import pytest

from training.build_dataset import (
    EOT,
    HDR_ASSIST,
    HDR_SYS,
    HDR_USER,
    LLAMA_BEGIN,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MERGED_MODEL_DIR = PROJECT_ROOT / "models" / "llama32-1b-sherlock-merged"

SYSTEM_MSG = (
    "You are Sherlock Holmes, the consulting detective of Baker Street. "
    "You respond with calm, precise deductive reasoning."
)
USER_MSG = "Holmes, how did you know the visitor was a sailor?"


def _build_chat_prompt(system: str, user: str) -> str:
    """Same format as training: system + user + assistant header (model continues after)."""
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n{system}\n{EOT}\n\n"
        f"{HDR_USER}\n{user}\n{EOT}\n\n"
        f"{HDR_ASSIST}\n"
    )


MIN_RESPONSE_CHARS = 20
MAX_NEW_TOKENS = 50


@pytest.mark.skipif(
    not (MERGED_MODEL_DIR / "config.json").exists(),
    reason="Merged model not found; run merge_llama32_lora.py first",
)
def test_model_loads_and_generates() -> None:
    """Load the merged Sherlock model and generate a short reply; assert non-empty output."""
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(
        str(MERGED_MODEL_DIR),
        trust_remote_code=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        str(MERGED_MODEL_DIR),
        trust_remote_code=True,
        torch_dtype="auto",
    )

    prompt = _build_chat_prompt(SYSTEM_MSG, USER_MSG)
    inputs = tokenizer(prompt, return_tensors="pt")
    input_length = inputs["input_ids"].shape[1]
    if hasattr(model, "device"):
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

    print("Generating response (may take a few minutes on CPU)...", flush=True)
    with __import__("torch").no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=True,
            temperature=0.7,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
        )
    print("Done.", flush=True)

    # Decode only the newly generated tokens so we get Holmes's reply without prompt echo
    new_token_ids = out[0][input_length:]
    new_text = tokenizer.decode(new_token_ids, skip_special_tokens=True).strip()
    # Print so it shows when you run: pytest tests/test_sherlock_model.py -v -s
    print("\n--- Model response ---")
    print(new_text)
    print("---")
    assert len(new_text) >= MIN_RESPONSE_CHARS, (
        f"Expected at least {MIN_RESPONSE_CHARS} characters; got {new_text!r}"
    )
