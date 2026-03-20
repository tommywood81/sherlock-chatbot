import { fireEvent, render, screen } from "@testing-library/react";
import ExplanationHint from "../ExplanationHint";
import ConfidenceInfo from "../ConfidenceInfo";
import TokenTooltip from "../TokenTooltip";
import TokenStream from "../TokenStream";

describe("Explanation UX components", () => {
  test("renders and dismisses global explanation hint", () => {
    render(<ExplanationHint />);
    expect(
      screen.getByText(/This model generates text one token at a time\./i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Dismiss helper text/i }));
    expect(
      screen.queryByText(/This model generates text one token at a time\./i)
    ).not.toBeInTheDocument();
  });

  test("shows confidence help copy when toggled", () => {
    render(<ConfidenceInfo confidence={0.82} />);
    expect(screen.getByText("82.0%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Explain confidence/i }));
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          (el.textContent ?? "").includes("per-step certainty")
      )
    ).toBeInTheDocument();
  });

  test("renders token tooltip alternatives and explanatory text", () => {
    render(
      <TokenTooltip
        token="Holmes"
        alternatives={[
          { token: "Watson", prob: 0.21 },
          { token: "Lestrade", prob: 0.11 },
        ]}
      />
    );
    expect(
      screen.getByText(/Per-step top/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Holmes")).toBeInTheDocument();
    expect(screen.getByText("Watson")).toBeInTheDocument();
    expect(screen.getByText("21.0%")).toBeInTheDocument();
  });

  test("TokenStream click opens tooltip with alternatives", () => {
    render(
      <TokenStream
        tokens={["Holmes", "deduces"]}
        isStreaming={false}
        tokenAlternatives={{ 0: [{ token: "Watson", prob: 0.21 }] }}
        autoSelectAlternatives={false}
      />
    );

    // Tooltip should not be visible until a token is clicked.
    expect(
      screen.queryByText(/Selected subword/i)
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Holmes"));

    expect(screen.getByText("Selected subword")).toBeInTheDocument();
    expect(screen.getByText("Watson")).toBeInTheDocument();
    expect(screen.getByText("21.0%")).toBeInTheDocument();

    // Selected token text is inside the tooltip (avoid matching the token button).
    const selectedTokenLabel = screen.getByText("Selected subword");
    const tooltipRoot = selectedTokenLabel.parentElement;
    expect(tooltipRoot).not.toBeNull();
    expect(tooltipRoot).toHaveTextContent("Holmes");
  });
});

