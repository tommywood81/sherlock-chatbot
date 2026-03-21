import { describe, expect, it } from "vitest";
import {
  buildModelInsight,
  buildTokenMetas,
  calculateEntropy,
  computeTokenConfidence,
  filterDecisionPoints,
  getAnswerContentStartChar,
  getAnswerTokenIndices,
  normalizeProbabilities,
} from "../inferenceAnalytics";

describe("inferenceAnalytics", () => {
  it("normalizes probabilities", () => {
    expect(normalizeProbabilities([0.5, 0.5])).toEqual([0.5, 0.5]);
    expect(normalizeProbabilities([1, 3])).toEqual([0.25, 0.75]);
  });

  it("computes entropy", () => {
    const h = calculateEntropy([{ prob: 0.5 }, { prob: 0.5 }]);
    expect(h).toBeCloseTo(1, 5);
  });

  it("maps answer token indices from cumulative text", () => {
    const full = "pre[ANSWER]\nAB";
    const tokens = ["pre", "[ANSWER]", "\n", "A", "B"];
    expect(getAnswerContentStartChar(full)).toBe(11);
    expect(getAnswerTokenIndices(tokens, full)).toEqual([2, 3, 4]);
  });

  it("buildTokenMetas and filterDecisionPoints", () => {
    const tokens = ["a", "b"];
    const alts = {
      0: [
        { token: "a", prob: 0.5 },
        { token: "x", prob: 0.4 },
      ],
      1: [{ token: "b", prob: 0.95 }],
    };
    const metas = buildTokenMetas(tokens, alts);
    expect(computeTokenConfidence("a", alts[0])).toBe(0.5);
    const dps = filterDecisionPoints(metas);
    expect(dps.some((m) => m.index === 0)).toBe(true);
  });

  it("buildModelInsight returns a string", () => {
    const s = buildModelInsight(
      buildTokenMetas(["x"], { 0: [{ token: "x", prob: 0.9 }] })
    );
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(5);
  });
});
