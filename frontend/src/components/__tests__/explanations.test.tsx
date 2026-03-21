import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import InspectGenerationToggle from "../inference/InspectGenerationToggle";
import ModelMetricsSection from "../inference/ModelMetricsSection";
import WhyThisAnswer from "../inference/WhyThisAnswer";

describe("Inference inspection UI", () => {
  test("InspectGenerationToggle toggles with accessible name", () => {
    const onChange = vi.fn();
    render(<InspectGenerationToggle enabled={false} onChange={onChange} />);
    const btn = screen.getByRole("switch", { name: /inspect generation/i });
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("WhyThisAnswer shows section title and bullets", () => {
    render(
      <WhyThisAnswer
        bullets={[
          "Treats the question as a matter of observation at the scene.",
          "Keeps the reply short and direct.",
        ]}
      />
    );
    expect(screen.getByText(/why this answer/i)).toBeInTheDocument();
    expect(screen.getByText(/Treats the question/i)).toBeInTheDocument();
  });

  test("ModelMetricsSection renders model card scalars", () => {
    render(
      <ModelMetricsSection
        card={{
          latencyMs: 88,
          tokensGenerated: 24,
          meanConfidence: 0.81,
          meanEntropyBits: 1.2,
          meanNegLogProb: 0.21,
          approxPerplexity: 1.23,
          answerTokenCount: 18,
        }}
      />
    );
    expect(screen.getByText(/model metrics/i)).toBeInTheDocument();
    expect(screen.getByText("88 ms")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });
});
