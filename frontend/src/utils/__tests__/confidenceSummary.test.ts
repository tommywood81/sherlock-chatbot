import { describe, expect, it } from "vitest";
import type { InferenceModelCard } from "../../types/inferenceTypes";
import { formatConfidenceValue } from "../confidenceSummary";

describe("confidenceSummary", () => {
  it("uses mean confidence when answer tokens exist", () => {
    const card: InferenceModelCard = {
      latencyMs: 10,
      tokensGenerated: 5,
      meanConfidence: 0.776,
      meanEntropyBits: 0,
      meanNegLogProb: 0,
      approxPerplexity: 1,
      answerTokenCount: 3,
    };
    expect(formatConfidenceValue(card, null)).toBe("0.78");
  });

  it("falls back to stream confidence without answer stats", () => {
    const card: InferenceModelCard = {
      latencyMs: 10,
      tokensGenerated: 5,
      meanConfidence: 0,
      meanEntropyBits: 0,
      meanNegLogProb: 0,
      approxPerplexity: 1,
      answerTokenCount: 0,
    };
    expect(formatConfidenceValue(card, 0.812)).toBe("0.81");
  });
});
