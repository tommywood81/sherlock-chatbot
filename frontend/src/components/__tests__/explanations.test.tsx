import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import RawReasoningCollapsible from "../inference/RawReasoningCollapsible";
import WhereModelHesitated from "../inference/WhereModelHesitated";
import WhyThisAnswer from "../inference/WhyThisAnswer";

describe("Inference UI (minimal)", () => {
  test("WhyThisAnswer shows title and bullets", () => {
    render(
      <WhyThisAnswer
        bullets={["Treats the question as observation at the scene.", "Keeps the reply direct."]}
      />
    );
    expect(screen.getByText(/why this answer/i)).toBeInTheDocument();
    expect(screen.getByText(/Treats the question/i)).toBeInTheDocument();
  });

  test("WhereModelHesitated renders hesitant step", () => {
    render(
      <WhereModelHesitated
        steps={[
          {
            tokenIndex: 0,
            contextSnippet: "…",
            chosenText: "likely",
            chosenProb: 0.41,
            alternates: [
              { text: "may", prob: 0.38 },
              { text: "could", prob: 0.12 },
            ],
            confidence: 0.41,
            top1Top2Margin: 0.03,
          },
        ]}
      />
    );
    expect(screen.getByText(/likely/i)).toBeInTheDocument();
  });

  test("RawReasoningCollapsible shows summary and body", () => {
    render(<RawReasoningCollapsible text="Line one.\nLine two." />);
    expect(screen.getByText(/view raw reasoning/i)).toBeInTheDocument();
  });
});
