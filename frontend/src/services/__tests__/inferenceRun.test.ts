import { describe, expect, it } from "vitest";
import type { StreamMetrics } from "../../api/client";
import { buildInferenceRunResult, whyThisAnswerBullets } from "../inferenceRun";

/** Must match the concatenation of `tokens` in the test below (backend stream shape). */
const SAMPLE_STREAMED = "[REASONING]\nLine one.\n[ANSWER]\nElementary.";

describe("inferenceRun", () => {
  it("whyThisAnswerBullets trims and caps lines from model reasoning", () => {
    const lines = [
      "  1) The question concerns the missing letter.",
      "- We assume the envelope was handled once.",
    ];
    expect(whyThisAnswerBullets(lines)).toEqual([
      "The question concerns the missing letter.",
      "We assume the envelope was handled once.",
    ]);
  });

  it("buildInferenceRunResult parses answer span and attaches token rows", () => {
    const tokens = [
      "[REASONING]",
      "\n",
      "Line one.",
      "\n",
      "[ANSWER]",
      "\n",
      "Elementary",
      ".",
    ];
    const candidatesByIndex: Record<number, import("../../api/client").TopTokenCandidate[]> = {
      6: [
        { token: "Elementary", prob: 0.55 },
        { token: "Quite", prob: 0.12 },
      ],
      7: [{ token: ".", prob: 0.98 }],
    };
    const streamMetrics: StreamMetrics = {
      latency_ms: 95,
      tokens_generated: tokens.length,
      tokens_per_second: 10,
      confidence: 0.77,
    };

    const run = buildInferenceRunResult({
      prompt: "Who took the letter?",
      tokens,
      candidatesByIndex,
      streamedText: SAMPLE_STREAMED,
      streamMetrics,
      latencyMsClient: 100,
    });

    expect(run.answer).toContain("Elementary");
    expect(run.answerTokens.length).toBeGreaterThanOrEqual(1);
    expect(run.whyThisAnswer.length).toBeGreaterThanOrEqual(1);
    expect(run.modelCard.latencyMs).toBe(95);
    expect(run.modelCard.answerTokenCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(run.notableNextTokenSteps)).toBe(true);
    expect(run.reasoningRaw).toContain("Line one");
  });
});
