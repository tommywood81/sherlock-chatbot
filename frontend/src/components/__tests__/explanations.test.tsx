import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ConfidenceInfo from "../ConfidenceInfo";
import AlternativeCard from "../inference/AlternativeCard";
import InsightPanel from "../inference/InsightPanel";
import ReasoningPanel from "../inference/ReasoningPanel";

describe("Inference guided demo UI", () => {
  test("InsightPanel explains best-fit decoding", () => {
    render(<InsightPanel />);
    expect(screen.getByText(/best-fit/i)).toBeInTheDocument();
    expect(screen.getByText(/one word at a time/i)).toBeInTheDocument();
  });

  test("ReasoningPanel shows label and steps", () => {
    render(<ReasoningPanel steps={["Step one", "Step two"]} />);
    expect(screen.getByText(/How the model thought/i)).toBeInTheDocument();
    expect(screen.getByText(/Step one/)).toBeInTheDocument();
  });

  test("AlternativeCard shows path and probabilities", () => {
    render(
      <AlternativeCard
        branch={{
          pathNumber: 1,
          originalToken: "guilty",
          originalProb: 0.62,
          altToken: "innocent",
          altProb: 0.31,
          result: "The suspect may be innocent.",
        }}
      />
    );
    const card = screen.getByRole("article");
    expect(card).toHaveTextContent(/Alternative path #1/i);
    expect(card.textContent).toContain("guilty");
    expect(card.textContent).toContain("31%");
    expect(card.textContent).toContain("62%");
    expect(screen.getByText(/The suspect may be innocent/i)).toBeInTheDocument();
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
