import { describe, expect, it } from "vitest";
import type { AnswerTokenRow } from "../../types/inferenceTypes";
import {
  buildTokenMapMetas,
  formatCandidateTooltip,
  pickEmphasizedIndices,
  shouldShowProb,
} from "../tokenMap";

function row(
  text: string,
  tops: Array<{ token: string; prob: number }>
): AnswerTokenRow {
  const confidence = tops.find((t) => t.token === text)?.prob ?? tops[0]?.prob ?? 0;
  return { text, confidence, topCandidates: tops.map((t) => ({ token: t.token, prob: t.prob })) };
}

describe("tokenMap", () => {
  it("shouldShowProb filters extremes", () => {
    expect(shouldShowProb(1)).toBe(false);
    expect(shouldShowProb(0)).toBe(false);
    expect(shouldShowProb(0.5)).toBe(true);
  });

  it("formatCandidateTooltip caps at three", () => {
    const r = row("a", [
      { token: "a", prob: 0.4 },
      { token: "b", prob: 0.35 },
      { token: "c", prob: 0.2 },
      { token: "d", prob: 0.05 },
    ]);
    const t = formatCandidateTooltip(r);
    expect(t.split("·").length).toBeLessThanOrEqual(3);
    expect(t).toContain("a");
  });

  it("pickEmphasizedIndices prefers non-top", () => {
    const rows: AnswerTokenRow[] = [
      row("x", [
        { token: "z", prob: 0.7 },
        { token: "x", prob: 0.3 },
      ]),
    ];
    const s = pickEmphasizedIndices(rows);
    expect(s.has(0)).toBe(true);
  });

  it("buildTokenMapMetas marks stable when not emphasized", () => {
    const rows: AnswerTokenRow[] = Array.from({ length: 20 }, () =>
      row("a", [
        { token: "a", prob: 0.51 },
        { token: "b", prob: 0.49 },
      ])
    );
    const metas = buildTokenMapMetas(rows);
    const emphasized = metas.filter((m) => m.emphasized).length;
    expect(emphasized).toBeLessThanOrEqual(8);
  });
});
