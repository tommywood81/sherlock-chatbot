"""
Stage 3: Build training dataset JSONL from Markdown pairs.

Input: data/pairs/*.md (each file contains exactly one pair with headings:
### System, ### Instruction, ### Response)

Output: data/processed/train.jsonl
Each line is: {"text": "<llama chat template conversation>"}

Chat template (Llama-style chat tokens, explicit IDs):
<|begin_of_text|>
<|start_header_id|>system<|end_header_id|>
...
<|eot_id|>
<|start_header_id|>user<|end_header_id|>
...
<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
...
<|eot_id|>

Tokenization and masking are applied during training; this stage only produces
the JSONL text field and validates structural correctness.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, List, Tuple


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PAIRS_DIR = PROJECT_ROOT / "data" / "pairs"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
TRAIN_JSONL_PATH = PROCESSED_DIR / "train.jsonl"

MAX_SEQ_LENGTH = 1024
BASE_TOKENIZER_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


LLAMA_BEGIN = "<|begin_of_text|>"
HDR_SYS = "<|start_header_id|>system<|end_header_id|>"
HDR_USER = "<|start_header_id|>user<|end_header_id|>"
HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>"
EOT = "<|eot_id|>"


@dataclass(frozen=True)
class Pair:
    system: str
    instruction: str
    response: str


_BLOCK_RE = re.compile(
    r"###\s*System\s*(?P<system>.*?)"
    r"###\s*Instruction\s*(?P<instruction>.*?)"
    r"###\s*Response\s*(?P<response>.*)$",
    flags=re.DOTALL | re.IGNORECASE,
)


def parse_pair_markdown(content: str) -> Pair:
    """Parse a single-pair Markdown file into system/instruction/response."""
    match = _BLOCK_RE.search(content)
    if not match:
        raise ValueError("Markdown pair is missing required headings.")

    system = match.group("system").strip()
    instruction = match.group("instruction").strip()
    response = match.group("response").strip()

    if not system or not instruction or not response:
        raise ValueError("System/Instruction/Response must be non-empty.")

    return Pair(system=system, instruction=instruction, response=response)


def to_llama_chat_text(pair: Pair) -> str:
    """Convert parsed pair into the explicit Llama chat template text."""
    # Do not modify wording; preserve as-is.
    return (
        f"{LLAMA_BEGIN}\n"
        f"{HDR_SYS}\n"
        f"{pair.system}\n"
        f"{EOT}\n\n"
        f"{HDR_USER}\n"
        f"{pair.instruction}\n"
        f"{EOT}\n\n"
        f"{HDR_ASSIST}\n"
        f"{pair.response}\n"
        f"{EOT}"
    )


def iter_pair_files(pairs_dir: Path = PAIRS_DIR) -> Iterator[Path]:
    """Yield Markdown pair files in deterministic order."""
    yield from sorted(pairs_dir.glob("*.md"))


def _looks_like_holmes_response(text: str) -> bool:
    """Simple length check; no enforced keywords to avoid filtering out diverse templates."""
    return len(text.strip().split()) > 12


def build_jsonl_records(pairs_dir: Path = PAIRS_DIR) -> Iterator[dict]:
    """Yield JSON-serializable records for all pair files, applying basic quality checks."""
    dropped_empty = 0
    dropped_length = 0
    dropped_speaker = 0

    for path in iter_pair_files(pairs_dir):
        content = path.read_text(encoding="utf-8", errors="replace")
        pair = parse_pair_markdown(content)

        inst = pair.instruction.strip()
        resp = pair.response.strip()
        if not inst or not resp:
            dropped_empty += 1
            continue
        # Approximate token-length band for small model: ~40–150 tokens
        if len(resp) < 120 or len(resp) > 900:
            dropped_length += 1
            continue
        if not _looks_like_holmes_response(resp):
            dropped_speaker += 1
            continue

        text = to_llama_chat_text(pair)
        yield {"text": text}

    if dropped_empty or dropped_length or dropped_speaker:
        logger.info(
            "Dropped %d pairs (empty), %d pairs (length out of range), %d pairs (non-Holmes speaker) during JSONL build",
            dropped_empty,
            dropped_length,
            dropped_speaker,
        )


def write_jsonl(records: Iterable[dict], out_path: Path = TRAIN_JSONL_PATH) -> int:
    """Write records to JSONL. Returns number of records written."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with out_path.open("w", encoding="utf-8", newline="\n") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            count += 1
    return count


def _try_load_tokenizer():
    """Best-effort tokenizer load (may require internet/auth). Returns tokenizer or None."""
    try:
        from transformers import AutoTokenizer  # type: ignore
    except Exception:
        return None
    try:
        tok = AutoTokenizer.from_pretrained(BASE_TOKENIZER_ID)
        return tok
    except Exception:
        return None


def compute_token_lengths(texts: List[str]) -> Tuple[float, int]:
    """
    Compute (avg_len, max_len) using the base tokenizer.
    If tokenizer cannot be loaded, returns (-1.0, -1).
    """
    tok = _try_load_tokenizer()
    if tok is None:
        return (-1.0, -1)
    lengths: List[int] = []
    for t in texts:
        ids = tok(t, truncation=True, padding=False, max_length=MAX_SEQ_LENGTH).get("input_ids", [])
        lengths.append(len(ids))
    if not lengths:
        return (0.0, 0)
    return (sum(lengths) / len(lengths), max(lengths))


def validate_llama_format(text: str) -> None:
    """Basic structural validation for a single formatted conversation."""
    required = [LLAMA_BEGIN, HDR_SYS, HDR_USER, HDR_ASSIST, EOT]
    for token in required:
        if token not in text:
            raise ValueError(f"Missing token in chat text: {token}")
    # Ensure ordering
    sys_pos = text.find(HDR_SYS)
    user_pos = text.find(HDR_USER)
    asst_pos = text.find(HDR_ASSIST)
    if not (0 <= sys_pos < user_pos < asst_pos):
        raise ValueError("Chat headers are out of order.")


def run(pairs_dir: Path = PAIRS_DIR, out_path: Path = TRAIN_JSONL_PATH) -> dict:
    """Build dataset JSONL and print a Stage 3 report. Returns stats dict."""
    records = list(build_jsonl_records(pairs_dir))
    for rec in records:
        validate_llama_format(rec["text"])

    # Optional: add a small set of identity/personality anchors (~10% of dataset)
    identity_pairs = [
        Pair(
            system=(
                "You are Sherlock Holmes, the consulting detective of Baker Street. "
                "You respond with calm, precise deductive reasoning."
            ),
            instruction="Who are you?",
            response=(
                "I am Sherlock Holmes, consulting detective of Baker Street. "
                "My profession is to observe what others overlook."
            ),
        ),
        Pair(
            system=(
                "You are Sherlock Holmes, the consulting detective of Baker Street. "
                "You respond with calm, precise deductive reasoning."
            ),
            instruction="Describe your method of deduction.",
            response=(
                "My method is simplicity itself: observe carefully, eliminate the impossible, "
                "and whatever remains, however improbable, must be the truth."
            ),
        ),
        Pair(
            system=(
                "You are Sherlock Holmes, the consulting detective of Baker Street. "
                "You respond with calm, precise deductive reasoning."
            ),
            instruction="How do you approach a new case?",
            response=(
                "I begin by gathering every available fact, however trivial it may seem. "
                "From these fragments I construct and test hypotheses until only one explanation fits them all."
            ),
        ),
    ]

    base_count = len(records)
    # Keep identity/personality anchors as a small fraction (~3%) to avoid
    # dominating starting n-grams while still anchoring persona.
    extra_target = int(base_count * 0.03)
    for i in range(extra_target):
        p = identity_pairs[i % len(identity_pairs)]
        records.append({"text": to_llama_chat_text(p)})

    n = write_jsonl(records, out_path)
    texts = [r["text"] for r in records]
    avg_len, max_len = compute_token_lengths(texts)

    stats = {
        "examples": n,
        "avg_token_length": avg_len,
        "max_token_length": max_len,
        "dataset_path": str(out_path),
    }

    logger.info("STAGE 3 COMPLETE")
    logger.info("  Examples: %d", n)
    if avg_len >= 0:
        logger.info("  Avg token length: %.2f", avg_len)
        logger.info("  Max token length: %d", max_len)
    else:
        logger.info("  Token lengths: unavailable (tokenizer not installed or cannot be loaded)")
    logger.info("  Dataset path: %s", out_path)
    return stats


def main() -> None:
    run()


if __name__ == "__main__":
    main()
