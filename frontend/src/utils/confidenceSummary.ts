import type { InferenceModelCard } from "../types/inferenceTypes";

/**
 * Single scalar for UI: mean chosen-token probability, or stream fallback, or em dash.
 */
export function formatConfidenceValue(
  card: InferenceModelCard,
  streamFallback?: number | null
): string {
  if (card.answerTokenCount > 0 && Number.isFinite(card.meanConfidence)) {
    return card.meanConfidence.toFixed(2);
  }
  if (streamFallback != null && Number.isFinite(streamFallback)) {
    return streamFallback.toFixed(2);
  }
  return "—";
}
