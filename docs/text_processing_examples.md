# Text Processing Examples

Three before/after examples for each processing step used in the Sherlock Holmes pipeline (`training/collect_pairs.py`).

---

## 1. Whitespace normalization

**What it does:** Collapse runs of spaces/tabs/newlines to a single space and strip leading/trailing whitespace.

| # | Before | After |
|---|--------|--------|
| 1 | `"  Holmes   examined  \n\n  the  mud.  "` | `"Holmes examined the mud."` |
| 2 | `"Watson asked:\t\t\"Why?\""` | `"Watson asked: \"Why?\""` |
| 3 | `"\n\n  The  clue  was  \n  obvious.\n  "` | `"The clue was obvious."` |

---

## 2. Gutenberg header/footer stripping

**What it does:** Keep only the body between `*** START OF THE PROJECT GUTENBERG EBOOK` and `*** END OF THE PROJECT GUTENBERG`; drop license, title block, and footer.

| # | Before (start of file) | After (what remains) |
|---|------------------------|----------------------|
| 1 | `"The Project Gutenberg eBook of A Study in Scarlet\n\nThis eBook is for the use of anyone...\n*** START OF THE PROJECT GUTENBERG EBOOK A STUDY IN SCARLET ***\n\n\nA STUDY IN SCARLET\n\nBy A. Conan Doyle\n\nIn the year 1878 I took my degree..."` | `"In the year 1878 I took my degree..."` (first real narrative line kept) |
| 2 | Content that has no START marker | Entire text unchanged |
| 3 | Content with `*** END OF THE PROJECT GUTENBERG EBOOK ...` in the middle | Everything after END is removed so footer text is not in body |

---

## 3. Paragraph splitting

**What it does:** Split on one or more newlines (with optional spaces), then normalize each block.

| # | Before (one string) | After (list of strings) |
|---|----------------------|--------------------------|
| 1 | `"Holmes looked at the boot.\n\nThere was mud on the sole."` | `["Holmes looked at the boot.", "There was mud on the sole."]` |
| 2 | `"PART I.\n\nCHAPTER I.\n\nIn the year 1878 I took my degree."` | `["PART I.", "CHAPTER I.", "In the year 1878 I took my degree."]` |
| 3 | `"He said nothing.\n  \n  \nShe waited."` | `["He said nothing.", "She waited."]` |

---

## 4. TOC / heading detection (dropped)

**What it does:** Mark paragraphs that look like table-of-contents or chapter headings so they are filtered out (e.g. not used as training passages).

| # | Example (detected as TOC/heading → dropped) |
|---|--------------------------------------------|
| 1 | `"PART I."` |
| 2 | `"CHAPTER I. MR. SHERLOCK HOLMES. CHAPTER II. THE SCIENCE OF DEDUCTION."` (multiple “chapter”) |
| 3 | `"I. A Scandal in Bohemia II. The Red-Headed League III. A Case of Identity"` (roman numeral start) |

| # | Example (not TOC → kept for length/suitability) |
|---|-------------------------------------------------|
| 1 | `"Holmes examined the letter and pointed to the handwriting."` |
| 2 | `"The mud on the boot suggested the visitor had crossed the marsh."` |
| 3 | `"Watson asked how he had deduced it."` |

---

## 5. Length filtering

**What it does:** Keep only paragraphs between 20 and 1000 characters (after normalization). Shorter/longer or all-caps “title” lines are dropped.

| # | Before | After |
|---|--------|--------|
| 1 | `"Yes."` (4 chars) | Dropped (< 20) |
| 2 | `"Holmes picked up the cigar ash and observed it under his lens. The character of the ash indicated a particular brand; from that we may infer the habits of the smoker."` (120 chars) | Kept (20–1000) |
| 3 | A single paragraph of 1500 characters | Dropped (> 1000) |

---

## 6. Project Gutenberg exclusion

**What it does:** Drop any paragraph that still contains the phrase “Project Gutenberg” (e.g. footer leakage).

| # | Before | After |
|---|--------|--------|
| 1 | `"Project Gutenberg is a registered trademark."` | Dropped |
| 2 | `"To protect the Project Gutenberg mission of promoting the free distribution of electronic works."` | Dropped |
| 3 | `"Holmes examined the document and found a clue."` | Kept (no Gutenberg text) |

---

## 7. Weak narrative skip

**What it does:** Drop passages that are too short, purely travel, purely scenic (with no suitability signal), or intro/summary phrases.

| # | Before | After |
|---|--------|--------|
| 1 | `"They set off by train. They arrived at the station. They reached the manor."` (no clue/deduction) | Dropped (travel-only, no signal) |
| 2 | `"The sky was beautiful. The moonlight lit the landscape."` (no clue/deduction) | Dropped (scenic, score 0) |
| 3 | `"As I have said, the case was singular."` | Dropped (intro/summary phrase) |

| # | Before | After |
|---|--------|--------|
| 1 | `"The mud on his boot suggested he had crossed the marsh."` (clue + inference) | Kept |
| 2 | `"Holmes examined the letter."` (Holmes observing, 25 chars) | Kept |
| 3 | `"Watson asked: 'How did you deduce it?'"` (dialogue, deduction word) | Kept |

---

## 8. Suitability scoring (≥1 signal kept)

**What it does:** Count how many of five criteria a passage hits: physical clue, suspicious behaviour, Holmes observing, deduction language, investigative action. Passages with at least 1 are kept.

| # | Passage | Signals | Score | Result |
|---|---------|--------|-------|--------|
| 1 | `"The footprint in the mud was deep."` | clue (footprint, mud) | 1 | Kept |
| 2 | `"Holmes observed the cigar ash and inferred the brand."` | Holmes observing, deduction (inferred), clue (cigar, ash) | 3 | Kept |
| 3 | `"The weather was fine. They had a pleasant journey."` | none | 0 | Dropped |

---

## 9. First-sentence extraction

**What it does:** Take text up to the first `.` `!` or `?`, then trim to a max length (e.g. 100 chars) for use in instructions.

| # | Before | After |
|---|--------|--------|
| 1 | `"Holmes examined the boot. There was mud on the sole. He looked up."` | `"Holmes examined the boot."` |
| 2 | `"What do you make of this?" Watson asked.` | `"What do you make of this?"` |
| 3 | `"The letter was forged."` (short) | `"The letter was forged."` |

---

## 10. Clue-phrase extraction

**What it does:** Prefer a short snippet (e.g. ~80 chars) that contains a clue keyword (footprint, mud, letter, etc.); otherwise fall back to the first sentence.

| # | Before (full passage) | After (clue phrase) |
|---|------------------------|----------------------|
| 1 | `"He had left in a hurry. Holmes picked up the cigar ash from the carpet and studied it."` | `"the cigar ash from the carpet and studied it"` (snippet around “cigar”, “ash”) |
| 2 | `"The handwriting on the letter was distinctive. Watson could not see the importance."` | `"The handwriting on the letter was distinctive"` (snippet around “handwriting”, “letter”) |
| 3 | `"There was a stain on his sleeve. It suggested he had been at the chemist’s."` | `"stain on his sleeve. It suggested he had been"` (snippet around “stain”) |
