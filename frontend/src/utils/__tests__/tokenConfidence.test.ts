import { describe, expect, it } from "vitest";
import { getConfidenceTier } from "../tokenConfidence";

describe("tokenConfidence", () => {
  it("tiers thresholds", () => {
    expect(getConfidenceTier(0.9)).toBe("high");
    expect(getConfidenceTier(0.75)).toBe("high");
    expect(getConfidenceTier(0.6)).toBe("medium");
    expect(getConfidenceTier(0.45)).toBe("medium");
    expect(getConfidenceTier(0.2)).toBe("low");
  });
});
