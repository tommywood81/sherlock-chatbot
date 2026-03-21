import { describe, expect, it } from "vitest";
import { textAfterLastAnswerMarker } from "../reasoning";

describe("reasoning helpers", () => {
  it("textAfterLastAnswerMarker returns tail after last marker", () => {
    const s = "[REASONING]\nx\n[ANSWER]\nShort\n[ANSWER]\nFull sentence here.";
    expect(textAfterLastAnswerMarker(s)).toBe("Full sentence here.");
  });
});
