import { describe, expect, it } from "vitest";
import { buildInferencePromptPreview, HDR_ASSIST, HDR_USER, SYSTEM_MSG } from "../inferencePromptTemplate";

describe("inferencePromptTemplate", () => {
  it("includes user message, system instructions, and assistant header", () => {
    const p = buildInferencePromptPreview("Why is the sky blue?");
    expect(p).toContain("Why is the sky blue?");
    expect(p).toContain(HDR_USER);
    expect(p).toContain(HDR_ASSIST);
    expect(p).toContain(SYSTEM_MSG.slice(0, 40));
    expect(p).not.toContain("[REASONING]");
  });
});
