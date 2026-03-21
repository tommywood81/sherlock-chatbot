/**
 * Data processing for the inference demo: probabilities, decision point, metrics.
 * Keep logic out of React components.
 */

import type { TokenAlternative } from "../api/client";

export interface TokenWithMeta {
  index: number;
  text: string;
  alternatives: TokenAlternative[];
  /** P(selected token | top-k), in [0, 1] */
  confidence: number;
  /** Shannon entropy of the top-k distribution (normalized to sum to 1). */
  entropy: number;
}

const ANSWER_MARKERS = ["[ANSWER]", "[answer]", "[FINAL ANSWER]", "[final answer]"] as const;

/** Character index where answer *content* starts (after leftmost marker), or null if none. */
export function getAnswerContentStartChar(fullText: string): number | null {
  let leftmost: { i: number; len: number } | null = null;
  for (const m of ANSWER_MARKERS) {
    const i = fullText.indexOf(m);
    if (i === -1) continue;
    if (!leftmost || i < leftmost.i) leftmost = { i, len: m.length };
  }
  return leftmost ? leftmost.i + leftmost.len : null;
}

/** Token indices whose *start* lies in the answer section (by cumulative join). */
export function getAnswerTokenIndices(tokens: string[], fullText: string): number[] {
  const start = getAnswerContentStartChar(fullText);
  if (start === null) return tokens.map((_, i) => i);
  let pos = 0;
  const out: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (pos >= start) out.push(i);
    pos += t.length;
  }
  return out;
}

export function normalizeProbabilities(values: number[]): number[] {
  const s = values.reduce((a, b) => a + b, 0);
  if (s <= 0) return values.map(() => 0);
  return values.map((v) => v / s);
}

export function calculateEntropy(distribution: { prob: number }[]): number {
  let h = 0;
  for (const { prob } of distribution) {
    if (prob > 0 && prob < 1) h -= prob * Math.log2(prob);
  }
  return h;
}

/** Confidence for the emitted token from top-k alternatives. */
export function computeTokenConfidence(
  selectedText: string,
  alternatives: TokenAlternative[]
): number {
  if (!alternatives.length) return 0.5;
  for (const alt of alternatives) {
    if (alt.token === selectedText && typeof alt.prob === "number") return alt.prob;
  }
  const top = alternatives[0]?.prob;
  return typeof top === "number" ? top : 0.5;
}

export function buildTokenMetas(
  tokens: string[],
  alternativesByIndex: Record<number, TokenAlternative[]>
): TokenWithMeta[] {
  return tokens.map((text, index) => {
    const alternatives = alternativesByIndex[index] ?? [];
    const confidence = computeTokenConfidence(text, alternatives);
    const probs = normalizeProbabilities(
      alternatives.map((a) => (typeof a.prob === "number" ? a.prob : 0))
    );
    const entropy = calculateEntropy(
      alternatives
        .map((_, i) => ({ prob: probs[i] ?? 0 }))
        .filter((x) => x.prob > 0)
    );
    return { index, text, alternatives, confidence, entropy };
  });
}

export interface DecisionPointFilterOptions {
  topProbMax: number;
  closeRunnerUpGap: number;
  entropyMin: number;
}

const DEFAULT_FILTER: DecisionPointFilterOptions = {
  topProbMax: 0.85,
  closeRunnerUpGap: 0.12,
  entropyMin: 1.25,
};

export function filterDecisionPoints(
  metas: TokenWithMeta[],
  options: Partial<DecisionPointFilterOptions> = {}
): TokenWithMeta[] {
  const o = { ...DEFAULT_FILTER, ...options };
  return metas.filter((m) => {
    if (!m.alternatives.length) return false;
    const sorted = [...m.alternatives].sort(
      (a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0)
    );
    const p1 = Number(sorted[0]?.prob) || 0;
    const p2 = Number(sorted[1]?.prob) || 0;
    if (p1 < o.topProbMax) return true;
    if (sorted.length >= 2 && p1 - p2 < o.closeRunnerUpGap) return true;
    if (m.entropy >= o.entropyMin) return true;
    return false;
  });
}

/** First answer-span step that qualifies as a meaningful divergence point. */
export function extractDecisionPoint(metas: TokenWithMeta[]): TokenWithMeta | null {
  const candidates = filterDecisionPoints(metas);
  return candidates[0] ?? null;
}

/** Sort alternatives by reported probability (descending). */
export function sortAlternativesByProb(alts: TokenAlternative[]): TokenAlternative[] {
  return [...alts].sort((a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0));
}

/**
 * 2nd, 3rd, and 4th highest-probability alternatives (indices 1–3 after sorting).
 * Used to simulate “what if another likely word were chosen?”.
 */
export function getSecondThroughFourthRankedAlternatives(
  alternatives: TokenAlternative[]
): TokenAlternative[] {
  const sorted = sortAlternativesByProb(alternatives);
  return [sorted[1], sorted[2], sorted[3]].filter(
    (a): a is TokenAlternative => a != null && typeof a.prob === "number"
  );
}

export function computeAvgConfidencePercent(metas: TokenWithMeta[]): number {
  if (!metas.length) return 0;
  const avg = metas.reduce((s, m) => s + m.confidence, 0) / metas.length;
  return Math.round(avg * 1000) / 10;
}

/** Share of answer tokens that look like sensitive decisions (uncertain / competitive). */
export function computeDecisionSensitivityPercent(metas: TokenWithMeta[]): number {
  if (!metas.length) return 0;
  const uncertain = filterDecisionPoints(metas).length;
  return Math.round((uncertain / metas.length) * 1000) / 10;
}

/** Distinct token texts from the first decision points (for hero emphasis). */
export function pickHighlightTokenTexts(metas: TokenWithMeta[], max = 2): string[] {
  const dps = filterDecisionPoints(metas);
  const texts: string[] = [];
  const seen = new Set<string>();
  for (const m of dps) {
    if (texts.length >= max) break;
    const t = m.text?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    texts.push(m.text);
  }
  return texts;
}
