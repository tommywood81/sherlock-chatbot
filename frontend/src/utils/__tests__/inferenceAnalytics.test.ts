import { describe, expect, it } from "vitest";
import {
  buildTokenMetas,
  calculateEntropy,
  computeAvgConfidencePercent,
  computeDecisionSensitivityPercent,
  computeTokenConfidence,
  extractDecisionPoint,
  filterDecisionPoints,
  getAnswerContentStartChar,
  getAnswerTokenIndices,
  getSecondThroughFourthRankedAlternatives,
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

  it("buildTokenMetas, filterDecisionPoints, extractDecisionPoint", () => {
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
    const first = extractDecisionPoint(metas);
    expect(first?.index).toBe(0);
  });

  it("getSecondThroughFourthRankedAlternatives returns ranks 2–4", () => {
    const alts = [
      { token: "a", prob: 0.5 },
      { token: "b", prob: 0.3 },
      { token: "c", prob: 0.15 },
      { token: "d", prob: 0.05 },
    ];
    const picks = getSecondThroughFourthRankedAlternatives(alts);
    expect(picks.map((p) => p.token)).toEqual(["b", "c", "d"]);
  });

  it("computeAvgConfidencePercent and computeDecisionSensitivityPercent", () => {
    const metas = buildTokenMetas(
      ["a", "b"],
      {
        0: [
          { token: "a", prob: 0.5 },
          { token: "x", prob: 0.4 },
        ],
        1: [{ token: "b", prob: 0.95 }],
      }
    );
    const avg = computeAvgConfidencePercent(metas);
    expect(avg).toBeGreaterThan(0);
    const sens = computeDecisionSensitivityPercent(metas);
    expect(sens).toBeGreaterThanOrEqual(0);
  });
});
