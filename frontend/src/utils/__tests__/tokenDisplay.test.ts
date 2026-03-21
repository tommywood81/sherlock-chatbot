import { describe, expect, it } from "vitest";
import { formatTokenForDisplay, mergeTopCandidatesByToken } from "../tokenDisplay";

describe("tokenDisplay", () => {
  it("formats whitespace and control chars for display", () => {
    expect(formatTokenForDisplay("a b")).toBe("a·b");
    expect(formatTokenForDisplay("x\ny")).toBe("x↵y");
    expect(formatTokenForDisplay(".\n")).toBe(".↵");
  });

  it("merges duplicate token strings keeping max prob", () => {
    const merged = mergeTopCandidatesByToken([
      { token: ".", prob: 0.2 },
      { token: ".", prob: 0.65 },
      { token: "or", prob: 0.035 },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ token: ".", prob: 0.65 });
    expect(merged[1]).toEqual({ token: "or", prob: 0.035 });
  });
});
