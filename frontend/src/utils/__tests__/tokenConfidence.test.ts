import { describe, expect, it } from "vitest";
import { getConfidenceTier } from "../tokenConfidence";

describe("tokenConfidence", () => {
  it("tiers by probability", () => {
    expect(getConfidenceTier(0.8)).toBe("high");
    expect(getConfidenceTier(0.5)).toBe("medium");
    expect(getConfidenceTier(0.2)).toBe("low");
  });
});
