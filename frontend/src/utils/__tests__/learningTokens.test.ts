import { describe, expect, it } from "vitest";
import type { AnswerTokenRow } from "../../types/inferenceTypes";
import { firstNonTopTokenIndex, pickLessonTokenRows } from "../learningTokens";

function row(
  text: string,
  tops: Array<{ token: string; prob: number }>
): AnswerTokenRow {
  const confidence = tops.find((t) => t.token === text)?.prob ?? 0;
  return { text, confidence, topCandidates: tops.map((t) => ({ token: t.token, prob: t.prob })) };
}

describe("learningTokens", () => {
  it("finds first token where chosen is not top prob", () => {
    const rows: AnswerTokenRow[] = [
      row("a", [
        { token: "a", prob: 0.5 },
        { token: "b", prob: 0.4 },
      ]),
      row("x", [
        { token: "z", prob: 0.9 },
        { token: "x", prob: 0.1 },
      ]),
    ];
    expect(firstNonTopTokenIndex(rows)).toBe(1);
  });

  it("pickLessonTokenRows puts non-top first and caps length", () => {
    const rows: AnswerTokenRow[] = [
      row("a", [{ token: "a", prob: 1 }]),
      row("x", [
        { token: "z", prob: 0.6 },
        { token: "x", prob: 0.4 },
      ]),
      row("c", [{ token: "c", prob: 1 }]),
    ];
    const pick = pickLessonTokenRows(rows, 2);
    expect(pick.rows).toHaveLength(2);
    expect(pick.rows[0]?.text).toBe("x");
    expect(pick.highlightIndex).toBe(0);
  });
});
