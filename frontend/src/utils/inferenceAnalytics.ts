/**
 * Data processing for the inference dashboard (confidence, entropy, decision points).
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
  /** Below this top-1 probability → interesting */
  topProbMax: number;
  /** If top1 - top2 < this gap → interesting */
  closeRunnerUpGap: number;
  /** Entropy above this → interesting (scale depends on k; ~1.5+ often multi-way) */
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

/** Map raw confidences to [0,1] for heatmap (per answer span). */
export function normalizeConfidencesForHeatmap(confidences: number[]): number[] {
  if (!confidences.length) return [];
  const min = Math.min(...confidences);
  const max = Math.max(...confidences);
  if (max - min < 1e-6) return confidences.map(() => 0.65);
  return confidences.map((c) => (c - min) / (max - min));
}

export function buildModelInsight(answerMetas: TokenWithMeta[]): string {
  if (!answerMetas.length) return "Run a prompt to see how the model chose each phrase.";
  const confs = answerMetas.map((m) => m.confidence);
  const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
  const low = confs.filter((c) => c < 0.55).length;
  const decisions = filterDecisionPoints(answerMetas).length;
  const lines: string[] = [];
  if (avg >= 0.82 && decisions <= 2) lines.push("Most answer tokens were chosen with high confidence.");
  else if (avg < 0.7) lines.push("Several steps had competing continuations.");
  if (decisions >= 4) lines.push("Multiple decision points — phrasing had several plausible paths.");
  else if (low >= 3 && decisions < 4) lines.push("Uncertainty is concentrated in a few phrases.");
  if (lines.length === 0) lines.push("Balanced confidence across the answer.");
  return lines.slice(0, 2).join(" ");
}

export type HeatmapStyle = { backgroundColor: string };

export function heatmapBackgroundStyle(normalized: number): HeatmapStyle {
  const opacity = 0.08 + normalized * 0.22;
  return { backgroundColor: `rgba(15, 23, 42, ${opacity})` };
}
