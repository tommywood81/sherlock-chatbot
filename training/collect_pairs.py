"""
Stage 2: Quality-first instruction–response pair generation from Sherlock Holmes texts.

Loads raw text from data/raw/ only (holdout stories in data/test/ are excluded),
filters passages by suitability (clues, deductions, investigative content), generates
only high-quality pairs, and writes Markdown files to data/pairs/. Maintains ~70%
deduction, ~20% Watson dialogue, ~10% reasoning correction. No fixed count: pair
yield depends on suitable passages.
"""
import logging
import re
from pathlib import Path
from typing import List, Tuple

# Project layout: training/ is under project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_PAIRS = PROJECT_ROOT / "data" / "pairs"
# Holdout texts for evaluation only; never used for training (see data/test/README.md)
DATA_TEST = PROJECT_ROOT / "data" / "test"

# Target ranges: generate as many as possible from suitable passages
NOVEL_PAIRS_MIN = 200
NOVEL_PAIRS_MAX = 400
COLLECTION_PAIRS_MIN = 120
COLLECTION_PAIRS_MAX = 280
NOVEL_CHAR_THRESHOLD = 120_000  # above this => novel; else story collection

DEDUCTION_RATIO = 0.70
WATSON_RATIO = 0.20
CORRECTION_RATIO = 0.10

SYSTEM_PROMPT = """You are Sherlock Holmes, the consulting detective of Baker Street.
You respond with calm, precise deductive reasoning.
Explain clues before conclusions.
Your tone is analytical, Victorian, and confident."""

GUTENBERG_START = "*** START OF THE PROJECT GUTENBERG EBOOK"
GUTENBERG_END = "*** END OF THE PROJECT GUTENBERG"
MIN_PASSAGE_LEN = 20   # allow short Holmes dialogue lines
MAX_PASSAGE_LEN = 1000
MIN_RESPONSE_LEN = 30

# Suitability: passage must meet at least 1 of these (regex/case-insensitive)
CLUE_PHRASES = re.compile(
    r"\b(footprint|footprints|mud|ash|cigar|handwriting|clothing|weapon|boot|boots|"
    r"hat|pipe|letter|document|stain|mark|trace|blood|ink|paper|key|ring)\b",
    re.I,
)
SUSPICIOUS_PHRASES = re.compile(
    r"\b(hurried|conceal|concealed|contradiction|nervous|guilty|escape|"
    r"lie|lying|suspicious|unusual|strange|secret)\b",
    re.I,
)
HOLMES_OBSERVING = re.compile(
    r"Holmes\s+(examined|observed|looked|studied|inspected|glanced|saw|"
    r"noticed|picked up|took up|pointed to)",
    re.I,
)
DEDUCTION_PHRASES = re.compile(
    r"\b(deduce|infer|conclude|therefore|thus|clue|evidence|reasoning|"
    r"observation|conclusion|inference)\b",
    re.I,
)
INVESTIGATIVE_PHRASES = re.compile(
    r"\b(inspect|compare|comparison|examination|evidence|inference|"
    r"discovered|found|detected)\b",
    re.I,
)

# Passages to skip: weak narrative
WEAK_SCENIC = re.compile(
    r"\b(sky|weather|landscape|view|beautiful|moonlight|sunset)\b", re.I
)
WEAK_TRAVEL = re.compile(
    r"\b(journey|train|carriage|arrived at|set off|reached)\b", re.I
)
WEAK_INTRO_SUMMARY = re.compile(
    r"\b(in this story|we shall see|as I have said|to conclude)\b", re.I
)

# Holmes-style reasoning phrases (responses must contain at least one)
REASONING_PHRASES = [
    "It is evident that",
    "The inference is unavoidable",
    "The matter becomes clear when we observe",
    "From this we may deduce",
]

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Stats for report (set during run())
_run_stats: dict = {}


def _normalize_whitespace(text: str) -> str:
    """Collapse whitespace and strip."""
    return " ".join(text.split()).strip()


def passage_suitability_score(passage: str) -> int:
    """
    Score 0–5: how many suitability criteria the passage meets.
    At least 1 required for inclusion (one signal is enough).
    """
    lower = passage.lower()
    score = 0
    if CLUE_PHRASES.search(passage):
        score += 1
    if SUSPICIOUS_PHRASES.search(passage):
        score += 1
    if HOLMES_OBSERVING.search(passage):
        score += 1
    if DEDUCTION_PHRASES.search(passage):
        score += 1
    if INVESTIGATIVE_PHRASES.search(passage):
        score += 1
    return score


def should_skip_weak_narrative(passage: str) -> bool:
    """Skip purely scenic, travel, filler, or intro/summary passages (allow short dialogue)."""
    p = _normalize_whitespace(passage)
    if len(p) < 20:
        return True
    # Dominant travel with no investigative content
    if WEAK_TRAVEL.search(p) and not DEDUCTION_PHRASES.search(p) and not CLUE_PHRASES.search(p):
        return True
    # Purely scenic with no signal
    if WEAK_SCENIC.search(p) and passage_suitability_score(passage) < 1:
        return True
    if WEAK_INTRO_SUMMARY.search(p):
        return True
    return False


def _looks_like_heading_or_toc(paragraph: str) -> bool:
    """Detect table-of-contents or chapter headings."""
    text = paragraph.strip()
    lower = text.lower()
    if lower.startswith(("part i", "part ii", "part iii", "contents")):
        return True
    if lower.startswith(("chapter ", "chap. ")):
        return True
    if lower.count("chapter ") >= 2:
        return True
    if re.match(r"^(i|ii|iii|iv|v|vi|vii|viii|ix|x)\.\s", lower):
        return True
    words = text.split()
    if words:
        upper_words = sum(1 for w in words if w.isupper())
        if upper_words >= max(4, len(words) // 2) and len(text) < 260:
            return True
    return False


def strip_gutenberg_header(text: str) -> str:
    """Return body content between Gutenberg start and end markers; removes boilerplate."""
    start_idx = text.find(GUTENBERG_START)
    if start_idx == -1:
        body = text
    else:
        body = text[start_idx + len(GUTENBERG_START) :]
    end_idx = body.find(GUTENBERG_END)
    if end_idx != -1:
        body = body[:end_idx]
    body = body.strip()
    lines = body.split("\n")
    start = 0
    for i, line in enumerate(lines):
        if line.strip() and len(line.strip()) > 10 and not line.strip().isupper():
            start = i
            break
    return "\n".join(lines[start:]).strip()


def get_paragraphs(body: str) -> List[str]:
    """Split body into non-empty paragraphs."""
    raw = re.split(r"\n\s*\n", body)
    return [_normalize_whitespace(p) for p in raw if _normalize_whitespace(p)]


def filter_passages_basic(
    paragraphs: List[str],
    min_len: int = MIN_PASSAGE_LEN,
    max_len: int = MAX_PASSAGE_LEN,
) -> List[str]:
    """Length and TOC/heading filter only."""
    result: List[str] = []
    for p in paragraphs:
        if not (min_len <= len(p) <= max_len):
            continue
        if p.isupper() and len(p) < 200:
            continue
        if _looks_like_heading_or_toc(p):
            continue
        result.append(p)
    return result


def filter_suitable_passages(paragraphs: List[str]) -> Tuple[List[str], int]:
    """
    Keep only passages that meet at least 1 suitability signal and are not weak.
    Exclude any passage containing "Project Gutenberg" (footer leakage).
    Returns (suitable_passages, num_skipped).
    """
    suitable: List[str] = []
    skipped = 0
    for p in paragraphs:
        if "Project Gutenberg" in p or "project gutenberg" in p.lower():
            skipped += 1
            continue
        if should_skip_weak_narrative(p):
            skipped += 1
            continue
        if passage_suitability_score(p) < 1:
            skipped += 1
            continue
        suitable.append(p)
    return suitable, skipped


def _first_sentence(s: str, max_chars: int = 100) -> str:
    """First sentence or phrase for instructions; avoid long quotes."""
    s = s.strip()
    for sep in ".!?":
        idx = s.find(sep)
        if idx != -1:
            s = s[: idx + 1].strip()
            break
    if len(s) > max_chars:
        s = s[: max_chars - 3].rsplit(" ", 1)[0] + "..."
    return s


def _extract_clue_phrase(passage: str, max_chars: int = 80) -> str:
    """Short phrase highlighting a clue or observation for response body."""
    # Prefer a segment containing a clue word
    lower = passage.lower()
    for m in CLUE_PHRASES.finditer(passage):
        start = max(0, m.start() - 30)
        end = min(len(passage), m.end() + 50)
        snippet = passage[start:end].strip()
        snippet = _normalize_whitespace(snippet)
        if len(snippet) > max_chars:
            snippet = snippet[: max_chars - 3].rsplit(" ", 1)[0] + "..."
        if len(snippet) >= 20:
            return snippet
    return _first_sentence(passage, max_chars)


def _deduction_instruction(passage: str) -> str:
    """Question asking Holmes to deduce from an observation."""
    phrase = _first_sentence(passage, 90)
    if "?" in phrase:
        return phrase
    return f"What can Holmes deduce from the following observation? {phrase}"


def _deduction_response(passage: str) -> str:
    """
    Evidence-grounded response with a Holmes-style reasoning phrase.
    Explain the clue, what it implies, and conclusion.
    """
    clue = _extract_clue_phrase(passage, 70)
    response = (
        "From this we may deduce that the clue in question—"
        + clue
        + "—provides concrete evidence. "
        "The matter becomes clear when we observe what it implies: "
        "habits, recent movements, or character. "
        "The conclusion follows when one considers what such a detail would mean to a trained observer."
    )
    if len(response) < MIN_RESPONSE_LEN:
        response += " It is evident that a single detail, properly read, narrows the field considerably."
    return response


def _watson_instruction(passage: str) -> str:
    """Watson asks Holmes about the passage; cue required."""
    phrase = _first_sentence(passage, 70)
    return f'Watson asks: "Holmes, how do you explain this: {phrase}"'


def _watson_response(passage: str) -> str:
    """Holmes analytical reply with Victorian reasoning phrase; short, no long quote."""
    clue = _extract_clue_phrase(passage, 60)
    response = (
        '"My dear Watson," I replied, "the point turns on a single observation. '
        f"Here we have {clue}. "
        "The inference is unavoidable: from that we may deduce the rest—"
        'provided we do not leap ahead of the evidence."'
    )
    if len(response) < MIN_RESPONSE_LEN:
        response += " It is evident that the smallest circumstance, when accurately read, carries weight."
    return response


def _correction_instruction(passage: str) -> str:
    """Flawed reasoning statement for Holmes to correct. Use enough context to avoid duplicates."""
    phrase = _first_sentence(passage, 60)
    if len(phrase) < 15:
        phrase = _normalize_whitespace(passage)[:80].rsplit(" ", 1)[0] + "..."
    return (
        "A detective claims the suspect is guilty because of this single observation: "
        f'"{phrase}" Is this sound reasoning?'
    )


def _correction_response(passage: str) -> str:
    """Holmes explains why the reasoning is flawed; includes Victorian reasoning phrase."""
    response = (
        "The matter becomes clear when we observe the error: "
        "it is unsound to rest a conclusion upon a solitary impression. "
        "Observation gives us facts; inference must allow for alternative explanations "
        "and require corroboration. From this we may deduce that one may entertain "
        "several hypotheses; none amounts to proof without further evidence."
    )
    if len(response) < MIN_RESPONSE_LEN:
        response += " It is evident that sound reasoning keeps conjecture distinct from demonstration."
    return response


def build_pair(system: str, instruction: str, response: str) -> str:
    """Format a single training pair as Markdown (one pair per file, no trailing ---)."""
    return (
        "### System\n\n"
        f"{system}\n\n"
        "### Instruction\n\n"
        f"{instruction}\n\n"
        "### Response\n\n"
        f"{response}\n"
    )


def generate_pairs_quality_first(
    suitable_passages: List[str],
    target_min: int,
    target_max: int,
) -> List[Tuple[str, str, str]]:
    """
    Generate pairs from suitable passages. Type (deduction/watson/correction) is
    chosen by weighted random selection (70% / 20% / 10%). Generate as many
    unique pairs as possible up to target_max. No duplicate (instruction, response).
    """
    import random
    random.seed(42)

    pairs: List[Tuple[str, str, str]] = []
    seen: set[Tuple[str, str]] = set()
    n = len(suitable_passages)
    if n == 0:
        _run_stats["_last_type_counts"] = {"deduction": 0, "watson": 0, "correction": 0}
        return pairs

    types = ["deduction", "watson", "correction"]
    weights = [DEDUCTION_RATIO, WATSON_RATIO, CORRECTION_RATIO]
    # Build (passage_idx, type) with weighted random selection per slot
    combos: List[Tuple[int, str]] = []
    for i in range(n):
        for _ in range(3):  # up to 3 pairs per passage (one per type)
            pair_type = random.choices(types, weights=weights, k=1)[0]
            combos.append((i, pair_type))
    random.shuffle(combos)

    type_counts = {"deduction": 0, "watson": 0, "correction": 0}
    for passage_idx, pair_type in combos:
        if len(pairs) >= target_max:
            break
        passage = suitable_passages[passage_idx]
        if pair_type == "deduction":
            inst = _deduction_instruction(passage)
            resp = _deduction_response(passage)
        elif pair_type == "watson":
            inst = _watson_instruction(passage)
            resp = _watson_response(passage)
        else:
            inst = _correction_instruction(passage)
            resp = _correction_response(passage)
        key = (inst, resp)
        if key in seen:
            continue
        seen.add(key)
        pairs.append((SYSTEM_PROMPT, inst, resp))
        type_counts[pair_type] += 1

    _run_stats["_last_type_counts"] = type_counts
    return pairs


def novel_filename_to_pair_basename(raw_path: Path) -> str:
    """Map raw file path to pairs output basename."""
    name = raw_path.stem
    for prefix in ("The Project Gutenberg eBook of ", "The Project Gutenberg EBook of "):
        if name.startswith(prefix):
            name = name[len(prefix) :].strip()
            break
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"[-\s]+", "_", name).strip("_").lower()
    return name or "novel"


def is_novel(raw_path: Path) -> bool:
    """Classify by size: long text => novel (200–400 pairs), else collection (100–250)."""
    try:
        size = raw_path.stat().st_size
        return size >= NOVEL_CHAR_THRESHOLD
    except OSError:
        return True


def get_target_range(is_novel: bool) -> Tuple[int, int]:
    """Return (min_pairs, max_pairs) for this text type."""
    if is_novel:
        return (NOVEL_PAIRS_MIN, NOVEL_PAIRS_MAX)
    return (COLLECTION_PAIRS_MIN, COLLECTION_PAIRS_MAX)


def collect_pairs_for_file(
    raw_path: Path,
) -> Tuple[List[Tuple[str, str, str]], int, int]:
    """
    Load one text, clean, filter to suitable passages, generate pairs.
    Returns (pairs, num_paragraphs_skipped, num_suitable).
    """
    text = raw_path.read_text(encoding="utf-8", errors="replace")
    body = strip_gutenberg_header(text)
    paragraphs = get_paragraphs(body)
    basic = filter_passages_basic(paragraphs)
    suitable, num_skipped = filter_suitable_passages(basic)
    is_nov = is_novel(raw_path)
    target_min, target_max = get_target_range(is_nov)
    pairs = generate_pairs_quality_first(suitable, target_min, target_max)
    return pairs, num_skipped + (len(basic) - len(suitable)), len(suitable)


def write_pair_files(
    pairs: List[Tuple[str, str, str]], out_dir: Path, basename: str
) -> None:
    """Write each pair to <basename>_001.md, etc."""
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, (system, instruction, response) in enumerate(pairs, start=1):
        path = out_dir / f"{basename}_{i:03d}.md"
        path.write_text(build_pair(system, instruction, response), encoding="utf-8")
    logger.info("Wrote %d pairs to %s (basename=%s)", len(pairs), out_dir, basename)


def run(raw_dir: Path = DATA_RAW, pairs_dir: Path = DATA_PAIRS) -> dict:
    """
    Load all texts from raw_dir, generate quality-first pairs, write to pairs_dir.
    Removes Gutenberg headers and TOC; normalizes whitespace. Returns stats for report.
    """
    global _run_stats
    raw_dir = raw_dir.resolve()
    pairs_dir = pairs_dir.resolve()
    stats = {
        "pairs_per_text": {},
        "type_counts_per_text": {},
        "skipped_per_text": {},
        "suitable_per_text": {},
        "cleaning": "Gutenberg headers and TOC removed; whitespace normalized.",
    }
    _run_stats = stats

    if not raw_dir.exists():
        logger.error("Raw data directory does not exist: %s", raw_dir)
        return stats

    txt_files = sorted(raw_dir.glob("*.txt"))
    if not txt_files:
        logger.warning("No .txt files in %s", raw_dir)
        return stats

    pairs_dir.mkdir(parents=True, exist_ok=True)
    for old_file in pairs_dir.glob("*.md"):
        try:
            old_file.unlink()
        except OSError:
            logger.warning("Could not remove old pairs file: %s", old_file)

    global_seen: set[Tuple[str, str]] = set()
    for raw_path in txt_files:
        basename = novel_filename_to_pair_basename(raw_path)
        pairs, skipped, num_suitable = collect_pairs_for_file(raw_path)
        # Global deduplication: drop any (inst, resp) already written in a previous text
        unique_pairs = []
        for s, i, r in pairs:
            key = (i, r)
            if key in global_seen:
                continue
            global_seen.add(key)
            unique_pairs.append((s, i, r))
        # Count types from written pairs (by instruction pattern)
        tcounts = {"deduction": 0, "watson": 0, "correction": 0}
        for _s, i, _r in unique_pairs:
            if "Watson asks:" in i or "Holmes observes:" in i:
                tcounts["watson"] += 1
            elif "A detective claims" in i and "sound reasoning" in i:
                tcounts["correction"] += 1
            else:
                tcounts["deduction"] += 1
        stats["pairs_per_text"][basename] = len(unique_pairs)
        stats["skipped_per_text"][basename] = skipped
        stats["suitable_per_text"][basename] = num_suitable
        stats["type_counts_per_text"][basename] = tcounts
        if not unique_pairs:
            logger.warning("No pairs generated for %s (suitable=%d)", basename, num_suitable)
            continue
        write_pair_files(unique_pairs, pairs_dir, basename)

    # Print report
    _print_stage2_report(stats)
    return stats


def _print_stage2_report(stats: dict) -> None:
    """Print STAGE 2 COMPLETE report: pairs per text, types, skipped, cleaning."""
    logger.info("STAGE 2 COMPLETE")
    logger.info("Report:")
    for basename, count in stats.get("pairs_per_text", {}).items():
        logger.info("  %s: %d pairs", basename, count)
        tc = stats.get("type_counts_per_text", {}).get(basename, {})
        logger.info("    deduction: %d  dialogue: %d  correction: %d", tc.get("deduction", 0), tc.get("watson", 0), tc.get("correction", 0))
        logger.info("    skipped passages: %d  suitable: %d", stats.get("skipped_per_text", {}).get(basename, 0), stats.get("suitable_per_text", {}).get(basename, 0))
    logger.info("  Cleaning: %s", stats.get("cleaning", "—"))


def main() -> None:
    """Entry point for CLI."""
    run()


if __name__ == "__main__":
    main()
