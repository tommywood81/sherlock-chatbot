import type { TopTokenCandidate } from "../api/client";

/**
 * Make tokenizer subword pieces readable.
 * The model emits raw BPE pieces (often punctuation + newline), not whole words — use symbols
 * instead of escape sequences like "\\n" so the UI does not look like garbage.
 */
export function formatTokenForDisplay(token: string): string {
  if (token === "") return "⟨empty⟩";
  return Array.from(token)
    .map((ch) => {
      if (ch === "\n") return "↵";
      if (ch === "\r") return "⏎";
      if (ch === "\t") return "⇥";
      if (ch === " ") return "·";
      return ch;
    })
    .join("");
}

/**
 * Top-k may list several BPE ids that decode to the same visible string (e.g. multiple ".").
 * Merge by display string; keep the highest probability among duplicates.
 */
export function mergeTopCandidatesByToken(candidates: TopTokenCandidate[]): TopTokenCandidate[] {
  const byToken = new Map<string, TopTokenCandidate>();
  for (const c of candidates) {
    const key = c.token;
    const prev = byToken.get(key);
    const p = typeof c.prob === "number" ? c.prob : 0;
    if (!prev || (typeof prev.prob === "number" && p > prev.prob)) {
      byToken.set(key, { ...c, prob: p });
    }
  }
  return Array.from(byToken.values()).sort(
    (a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0)
  );
}
