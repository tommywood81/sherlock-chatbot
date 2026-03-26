import { describe, expect, it } from "vitest";
import type { StreamMetrics } from "../../api/client";
import { buildInferenceRunResult } from "../inferenceRun";

const SAMPLE_STREAMED =
  "Curious. The question concerns optics.\n\n" +
  "If sunlight scatters preferentially at shorter wavelengths, the sky appears blue to an observer.\n\n" +
  "The sky looks blue because shorter wavelengths of sunlight scatter more in the atmosphere.";

describe("inferenceRun", () => {
  it("buildInferenceRunResult uses full streamed text as answer and attaches token rows", () => {
    const tokens = SAMPLE_STREAMED.split("");
    const candidatesByIndex: Record<number, import("../../api/client").TopTokenCandidate[]> = {
      10: [
        { token: "C", prob: 0.55 },
        { token: "Q", prob: 0.12 },
      ],
    };
    const streamMetrics: StreamMetrics = {
      latency_ms: 95,
      tokens_generated: tokens.length,
      tokens_per_second: 10,
      confidence: 0.77,
    };

    const run = buildInferenceRunResult({
      prompt: "Why is the sky blue?",
      tokens,
      candidatesByIndex,
      streamedText: SAMPLE_STREAMED,
      streamMetrics,
      latencyMsClient: 100,
    });

    expect(run.answer).toContain("sky looks blue");
    expect(run.answerTokens.length).toBeGreaterThanOrEqual(1);
    expect(run.modelCard.latencyMs).toBe(95);
    expect(run.modelCard.answerTokenCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(run.notableNextTokenSteps)).toBe(true);
  });
});
