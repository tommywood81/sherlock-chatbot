import { describe, expect, it } from "vitest";
import {
  buildAnswerPrefixSnippet,
  buildNotableNextTokenRows,
  buildTokenMetas,
  calculateEntropy,
  computeAvgConfidencePercent,
  computeModelCardFromAnswerMetas,
  computeTokenConfidence,
  getAnswerContentStartChar,
  getAnswerTokenIndices,
  mapAnswerMetasToRows,
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

  it("maps answer token indices from cumulative text (project [REASONING]/[ANSWER] format)", () => {
    const full = "pre[ANSWER]\nAB";
    const tokens = ["pre", "[ANSWER]", "\n", "A", "B"];
    expect(getAnswerContentStartChar(full)).toBe(11);
    expect(getAnswerTokenIndices(tokens, full)).toEqual([2, 3, 4]);
  });

  it("buildTokenMetas and computeTokenConfidence use streamed top-k", () => {
    const tokens = ["Watson", "."];
    const candidatesByIndex = {
      0: [
        { token: "Watson", prob: 0.72 },
        { token: "My", prob: 0.14 },
      ],
      1: [{ token: ".", prob: 0.99 }],
    };
    const metas = buildTokenMetas(tokens, candidatesByIndex);
    expect(computeTokenConfidence("Watson", candidatesByIndex[0])).toBe(0.72);
    expect(metas[0].confidence).toBeCloseTo(0.72, 5);
    expect(metas[1].confidence).toBeCloseTo(0.99, 5);
  });

  it("mapAnswerMetasToRows preserves text and candidates", () => {
    const metas = buildTokenMetas(["The"], {
      0: [
        { token: "The", prob: 0.61 },
        { token: "A", prob: 0.22 },
      ],
    });
    const rows = mapAnswerMetasToRows(metas);
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("The");
    expect(rows[0].confidence).toBeCloseTo(0.61, 5);
    expect(rows[0].topCandidates).toHaveLength(2);
  });

  it("computeModelCardFromAnswerMetas aggregates answer-span stats", () => {
    const metas = buildTokenMetas(["The", "game"], {
      0: [{ token: "The", prob: 0.5 }],
      1: [{ token: "game", prob: 0.9 }],
    });
    const card = computeModelCardFromAnswerMetas(metas, 120, 12);
    expect(card.latencyMs).toBe(120);
    expect(card.tokensGenerated).toBe(12);
    expect(card.answerTokenCount).toBe(2);
    expect(card.meanConfidence).toBeGreaterThan(0);
    expect(card.approxPerplexity).toBeGreaterThan(1);
  });

  it("computeAvgConfidencePercent", () => {
    const metas = buildTokenMetas(["a", "b"], {
      0: [
        { token: "a", prob: 0.5 },
        { token: "x", prob: 0.4 },
      ],
      1: [{ token: "b", prob: 0.95 }],
    });
    const avg = computeAvgConfidencePercent(metas);
    expect(avg).toBeGreaterThan(0);
  });

  it("buildAnswerPrefixSnippet end-anchors context", () => {
    const rows = mapAnswerMetasToRows(
      buildTokenMetas(["The", " ", "game", " ", "is", " ", "afoot"], {
        0: [{ token: "The", prob: 0.9 }],
        1: [{ token: " ", prob: 1 }],
        2: [{ token: "game", prob: 0.9 }],
        3: [{ token: " ", prob: 1 }],
        4: [{ token: "is", prob: 0.9 }],
        5: [{ token: " ", prob: 1 }],
        6: [{ token: "afoot", prob: 0.9 }],
      })
    );
    const snip = buildAnswerPrefixSnippet(rows, 6, 12);
    expect(snip.startsWith("…")).toBe(true);
    expect(snip).toContain("game");
  });

  it("buildNotableNextTokenRows picks low confidence or tight margin", () => {
    const answerTokens = mapAnswerMetasToRows(
      buildTokenMetas(["likely", " ", "next"], {
        0: [
          { token: "likely", prob: 0.41 },
          { token: "may", prob: 0.38 },
          { token: "could", prob: 0.12 },
        ],
        1: [{ token: " ", prob: 1 }],
        2: [
          { token: "next", prob: 0.92 },
          { token: "step", prob: 0.05 },
        ],
      })
    );
    const notable = buildNotableNextTokenRows(answerTokens);
    expect(notable.length).toBeGreaterThanOrEqual(1);
    const first = notable[0];
    expect(first.chosenText).toBe("likely");
    expect(first.alternates.some((a) => a.text === "may")).toBe(true);
  });
});
