import { describe, expect, it } from "vitest";
import { parseReasoningOutput, stripLeadingReasoningHeader, textAfterLastAnswerMarker } from "../reasoning";

describe("reasoning helpers", () => {
  it("parseReasoningOutput exposes reasoningRaw between markers", () => {
    const s = "[REASONING]\nOne line.\n[ANSWER]\nDone.";
    const po = parseReasoningOutput(s);
    expect(po.reasoningRaw).toBe("One line.");
    expect(po.finalAnswer).toBe("Done.");
  });

  it("textAfterLastAnswerMarker returns tail after last marker", () => {
    const s = "[REASONING]\nx\n[ANSWER]\nShort\n[ANSWER]\nFull sentence here.";
    expect(textAfterLastAnswerMarker(s)).toBe("Full sentence here.");
  });

  it("stripLeadingReasoningHeader removes echoed section headers", () => {
    expect(stripLeadingReasoningHeader("[REASONING]\nHello")).toBe("Hello");
    expect(stripLeadingReasoningHeader("[reasoning]\n[REASONING]\nHi")).toBe("Hi");
  });
});
