/**
 * Token-level stats for inference (answer span, probabilities, entropy).
 */

import type { TopTokenCandidate } from "../api/client";
import type { AnswerTokenRow, InferenceModelCard, NotableStep } from "../types/inferenceTypes";

export interface TokenWithMeta {
  index: number;
  text: string;
  topCandidates: TopTokenCandidate[];
  /** P(selected token | top-k), in [0, 1] */
  confidence: number;
  /** Shannon entropy of the top-k distribution (normalized to sum to 1). */
  entropy: number;
}

const ANSWER_MARKERS = ["[ANSWER]", "[answer]", "[FINAL ANSWER]", "[final answer]"] as const;

export function getAnswerContentStartChar(fullText: string): number | null {
  let leftmost: { i: number; len: number } | null = null;
  for (const m of ANSWER_MARKERS) {
    const i = fullText.indexOf(m);
    if (i === -1) continue;
    if (!leftmost || i < leftmost.i) leftmost = { i, len: m.length };
  }
  return leftmost ? leftmost.i + leftmost.len : null;
}

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

export function computeTokenConfidence(
  selectedText: string,
  topCandidates: TopTokenCandidate[]
): number {
  if (!topCandidates.length) return 0.5;
  for (const c of topCandidates) {
    if (c.token === selectedText && typeof c.prob === "number") return c.prob;
  }
  const top = topCandidates[0]?.prob;
  return typeof top === "number" ? top : 0.5;
}

export function buildTokenMetas(
  tokens: string[],
  candidatesByIndex: Record<number, TopTokenCandidate[]>
): TokenWithMeta[] {
  return tokens.map((text, index) => {
    const topCandidates = candidatesByIndex[index] ?? [];
    const confidence = computeTokenConfidence(text, topCandidates);
    const probs = normalizeProbabilities(
      topCandidates.map((a) => (typeof a.prob === "number" ? a.prob : 0))
    );
    const entropy = calculateEntropy(
      topCandidates
        .map((_, i) => ({ prob: probs[i] ?? 0 }))
        .filter((x) => x.prob > 0)
    );
    return { index, text, topCandidates, confidence, entropy };
  });
}

export function sortTopCandidatesByProb(c: TopTokenCandidate[]): TopTokenCandidate[] {
  return [...c].sort((a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0));
}

export function mapAnswerMetasToRows(metas: TokenWithMeta[]): AnswerTokenRow[] {
  return metas.map((m) => ({
    text: m.text,
    confidence: m.confidence,
    topCandidates: m.topCandidates,
  }));
}

const NOTABLE_CONF_THRESHOLD = 0.55;
const NOTABLE_MARGIN_THRESHOLD = 0.15;
const NOTABLE_MAX_ROWS = 8;
const CONTEXT_SNIPPET_MAX = 28;

/**
 * Build preceding-text snippet (end of text before token at `tokenIndex`).
 */
export function buildAnswerPrefixSnippet(
  answerTokens: AnswerTokenRow[],
  tokenIndex: number,
  maxChars: number = CONTEXT_SNIPPET_MAX
): string {
  if (tokenIndex <= 0) return "…";
  let prefix = "";
  for (let i = 0; i < tokenIndex; i++) {
    prefix += answerTokens[i]?.text ?? "";
  }
  const t = prefix.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t.length ? `…${t}` : "…";
  return `…${t.slice(-maxChars)}`;
}

/**
 * Steps where the model was unsure or had a close runner-up (for insight panel).
 */
export function buildNotableNextTokenRows(answerTokens: AnswerTokenRow[]): NotableStep[] {
  type Scored = NotableStep & { sortKey: number };

  const scored: Scored[] = [];

  for (let tokenIndex = 0; tokenIndex < answerTokens.length; tokenIndex++) {
    const row = answerTokens[tokenIndex];
    const sorted = sortTopCandidatesByProb(row.topCandidates);
    if (sorted.length === 0) continue;

    const p1 = Number(sorted[0]?.prob);
    const p2 = sorted.length >= 2 ? Number(sorted[1]?.prob) : 0;
    const top1 = Number.isFinite(p1) ? p1 : row.confidence;
    const top2 = Number.isFinite(p2) ? p2 : 0;
    const margin = sorted.length >= 2 ? top1 - top2 : top1;

    const lowConfidence = row.confidence < NOTABLE_CONF_THRESHOLD;
    const tightRace = sorted.length >= 2 && margin < NOTABLE_MARGIN_THRESHOLD;
    if (!lowConfidence && !tightRace) continue;

    const chosenText = row.text;
    const chosenProb = row.confidence;
    const alternates = sorted
      .filter((c) => c.token !== chosenText)
      .slice(0, 4)
      .map((c) => ({
        text: c.token,
        prob: typeof c.prob === "number" ? c.prob : 0,
      }));

    const uncertainty =
      (1 - Math.min(1, Math.max(0, chosenProb))) * 0.55 +
      (sorted.length >= 2
        ? Math.min(1, Math.max(0, (NOTABLE_MARGIN_THRESHOLD - margin) / NOTABLE_MARGIN_THRESHOLD)) *
          0.45
        : 0.25);

    scored.push({
      tokenIndex,
      contextSnippet: buildAnswerPrefixSnippet(answerTokens, tokenIndex),
      chosenText,
      chosenProb,
      alternates,
      confidence: row.confidence,
      top1Top2Margin: margin,
      sortKey: uncertainty,
    });
  }

  scored.sort((a, b) => b.sortKey - a.sortKey);
  return scored.slice(0, NOTABLE_MAX_ROWS).map(({ sortKey, ...rest }) => rest);
}

/**
 * Scalar “model card” metrics derived from answer-span tokens (client-side).
 */
export function computeModelCardFromAnswerMetas(
  answerMetas: TokenWithMeta[],
  latencyMs: number,
  tokensGenerated: number
): InferenceModelCard {
  if (!answerMetas.length) {
    return {
      latencyMs,
      tokensGenerated,
      meanConfidence: 0,
      meanEntropyBits: 0,
      meanNegLogProb: 0,
      approxPerplexity: 1,
      answerTokenCount: 0,
    };
  }
  let sumConf = 0;
  let sumH = 0;
  let sumNll = 0;
  for (const m of answerMetas) {
    sumConf += m.confidence;
    sumH += m.entropy;
    const p = Math.min(Math.max(m.confidence, 1e-10), 1);
    sumNll += -Math.log(p);
  }
  const n = answerMetas.length;
  const meanNegLogProb = sumNll / n;
  return {
    latencyMs,
    tokensGenerated,
    meanConfidence: sumConf / n,
    meanEntropyBits: sumH / n,
    meanNegLogProb,
    approxPerplexity: Math.exp(meanNegLogProb),
    answerTokenCount: n,
  };
}

export function computeAvgConfidencePercent(metas: TokenWithMeta[]): number {
  if (!metas.length) return 0;
  const avg = metas.reduce((s, m) => s + m.confidence, 0) / metas.length;
  return Math.round(avg * 1000) / 10;
}
