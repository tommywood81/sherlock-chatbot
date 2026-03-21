/**
 * Single place to assemble an inference run for the dashboard (parsing + derived stats + copy).
 */

import type { StreamMetrics, TopTokenCandidate } from "../api/client";
import type { InferenceRunResult } from "../types/inferenceTypes";
import {
  buildNotableNextTokenRows,
  buildTokenMetas,
  computeModelCardFromAnswerMetas,
  getAnswerTokenIndices,
  mapAnswerMetasToRows,
} from "../utils/inferenceAnalytics";
import { parseReasoningOutput, parseStreamedReasoning } from "../utils/reasoning";

const MAX_BULLETS = 4;
const MAX_LINE_LEN = 180;

/**
 * Turn model reasoning lines into short, neutral bullets (no raw chain-of-thought dump).
 */
export function whyThisAnswerBullets(rawLines: string[]): string[] {
  const cleaned = rawLines
    .map((s) => s.replace(/^\s*\d+[\).\]]\s*/, "").replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_BULLETS);

  if (cleaned.length === 0) {
    return ["The model answered directly from your question."];
  }

  return cleaned.map((line) => {
    let t = line.trim();
    if (t.length > MAX_LINE_LEN) t = `${t.slice(0, MAX_LINE_LEN - 1)}…`;
    if (t.length && !/^[A-Z(]/.test(t)) {
      t = t.charAt(0).toUpperCase() + t.slice(1);
    }
    return t;
  });
}

export function buildInferenceRunResult(params: {
  prompt: string;
  tokens: string[];
  candidatesByIndex: Record<number, TopTokenCandidate[]>;
  streamedText: string;
  streamMetrics: StreamMetrics | null;
  latencyMsClient: number;
}): InferenceRunResult {
  const { prompt, tokens, candidatesByIndex, streamedText, streamMetrics, latencyMsClient } =
    params;

  const { steps: reasoningSteps, finalAnswer: streamedFinal, hasAnswerSection } =
    parseStreamedReasoning(streamedText);
  const po = parseReasoningOutput(streamedText);
  const finalAnswer =
    hasAnswerSection && streamedFinal
      ? streamedFinal
      : po.finalAnswer ?? streamedText.trim();

  const tokenMetas = buildTokenMetas(tokens, candidatesByIndex);
  const answerIndices = getAnswerTokenIndices(tokens, streamedText);
  const answerMetas = answerIndices.map((i) => tokenMetas[i]).filter(Boolean);

  const latencyMs = Math.round(streamMetrics?.latency_ms ?? latencyMsClient);
  const tokensGenerated = streamMetrics?.tokens_generated ?? tokens.length;

  const modelCard = computeModelCardFromAnswerMetas(answerMetas, latencyMs, tokensGenerated);

  const reasoningLines =
    reasoningSteps.length > 0 ? reasoningSteps : po.steps;

  const answerTokens = mapAnswerMetasToRows(answerMetas);

  return {
    prompt,
    answer: finalAnswer || "—",
    reasoningLines,
    whyThisAnswer: whyThisAnswerBullets(reasoningLines),
    answerTokens,
    notableNextTokenSteps: buildNotableNextTokenRows(answerTokens),
    modelCard,
  };
}
