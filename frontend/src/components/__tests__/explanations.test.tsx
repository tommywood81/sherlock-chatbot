import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ConfidenceInfo from "../ConfidenceInfo";
import ExploreToggle from "../inference/ExploreToggle";
import ModelInsightPanel from "../inference/ModelInsightPanel";
import TokenTooltip from "../inference/TokenTooltip";

describe("Inference product UI", () => {
  test("ExploreToggle toggles via switch", () => {
    const onChange = vi.fn();
    render(<ExploreToggle enabled={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("ModelInsightPanel renders text", () => {
    render(<ModelInsightPanel text="High confidence across tokens." />);
    expect(screen.getByText(/Model insight/i)).toBeInTheDocument();
    expect(screen.getByText(/High confidence across tokens/i)).toBeInTheDocument();
  });

  test("inference TokenTooltip lists alternatives", () => {
    render(
      <TokenTooltip
        token="Paris"
        alternatives={[
          { token: "Paris", prob: 0.78 },
          { token: "Lyon", prob: 0.12 },
        ]}
      />
    );
    expect(screen.getByText(/Next-token candidates at this step/i)).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
  });

  test("ConfidenceInfo explains aggregate score", () => {
    render(<ConfidenceInfo confidence={0.82} />);
    expect(screen.getByText("82.0%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Explain confidence/i }));
    const paras = screen.getAllByText((_, el) =>
      !!(el?.textContent ?? "").includes("per-step certainty")
    );
    expect(paras.length).toBeGreaterThanOrEqual(1);
  });
});
