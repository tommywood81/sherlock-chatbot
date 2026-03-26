import { describe, expect, it } from "vitest";
import { validateSamplingParamsAgainstMetrics } from "../client";

describe("validateSamplingParamsAgainstMetrics", () => {
  const sel = { temperature: 0.5, top_p: 0.9, max_tokens: 256 };

  it("passes when metrics match", () => {
    const r = validateSamplingParamsAgainstMetrics(sel, {
      temperature: 0.5,
      top_p: 0.9,
      max_tokens: 256,
      latency_ms: 10,
    });
    expect(r.ok).toBe(true);
  });

  it("fails when metrics are null", () => {
    const r = validateSamplingParamsAgainstMetrics(sel, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("did not return metrics");
  });

  it("fails when temperature is missing", () => {
    const r = validateSamplingParamsAgainstMetrics(sel, { top_p: 0.9, max_tokens: 256 });
    expect(r.ok).toBe(false);
  });

  it("fails on temperature drift", () => {
    const r = validateSamplingParamsAgainstMetrics(sel, {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 256,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("Temperature mismatch");
  });

  it("fails on max_tokens mismatch", () => {
    const r = validateSamplingParamsAgainstMetrics(sel, {
      temperature: 0.5,
      top_p: 0.9,
      max_tokens: 128,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("max_tokens mismatch");
  });
});
