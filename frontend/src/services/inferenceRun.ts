/**
 * Assemble an inference run for the dashboard (token stats + inspection rows).
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

  const answer = streamedText.trim();

  const tokenMetas = buildTokenMetas(tokens, candidatesByIndex);
  const answerIndices = getAnswerTokenIndices(tokens, streamedText);
  const answerMetas = answerIndices.map((i) => tokenMetas[i]).filter(Boolean);

  const latencyMs = Math.round(streamMetrics?.latency_ms ?? latencyMsClient);
  const tokensGenerated = streamMetrics?.tokens_generated ?? tokens.length;

  const modelCard = computeModelCardFromAnswerMetas(answerMetas, latencyMs, tokensGenerated);

  const answerTokens = mapAnswerMetasToRows(answerMetas);

  return {
    prompt,
    answer: answer || "—",
    answerTokens,
    notableNextTokenSteps: buildNotableNextTokenRows(answerTokens),
    modelCard,
  };
}
