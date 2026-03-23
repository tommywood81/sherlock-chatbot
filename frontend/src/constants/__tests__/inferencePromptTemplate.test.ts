import { describe, expect, it } from "vitest";
import { buildInferencePromptPreview, HDR_ASSIST, HDR_USER } from "../inferencePromptTemplate";

describe("inferencePromptTemplate", () => {
  it("includes user message and assistant header", () => {
    const p = buildInferencePromptPreview("Why is the sky blue?");
    expect(p).toContain("Why is the sky blue?");
    expect(p).toContain(HDR_USER);
    expect(p).toContain(HDR_ASSIST);
    expect(p).toContain("[REASONING]");
  });
});
