import type { NotableStep } from "../../types/inferenceTypes";
import { getConfidenceTier } from "../../utils/tokenConfidence";

function formatProb(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p * 1000) / 10}%`;
}

interface NextTokenProbabilitiesSectionProps {
  steps: NotableStep[];
  onSelectTokenIndex?: (tokenIndex: number) => void;
}

export default function NextTokenProbabilitiesSection({
  steps,
  onSelectTokenIndex,
}: NextTokenProbabilitiesSectionProps) {
  return (
    <section className="space-y-2">
      <h3
        className="text-xs font-semibold uppercase tracking-wide text-gray-500 cursor-help decoration-dotted underline-offset-4 underline decoration-gray-300"
        title="These are the points where the model nearly chose a different word."
      >
        What the model considered next
      </h3>
      <p className="text-xs text-gray-500">Moments where the model’s top choice wasn’t obvious.</p>

      {steps.length === 0 ? (
        <p className="text-sm text-gray-600 leading-relaxed">Every step had a clear top choice.</p>
      ) : (
        <ul className="space-y-0 divide-y divide-gray-100 border-t border-b border-gray-100">
          {steps.map((step) => {
            const tier = getConfidenceTier(step.confidence);
            const closeCall = step.top1Top2Margin < 0.15 && step.alternates.length > 0;
            const lowUncertainty = tier === "low";
            const mediumUncertainty = tier === "medium";

            return (
              <li key={step.tokenIndex}>
                <button
                  type="button"
                  onClick={() => onSelectTokenIndex?.(step.tokenIndex)}
                  className={[
                    "group flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 py-2.5 pl-3 pr-1 text-left transition-colors rounded-sm",
                    "hover:bg-gray-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1",
                    lowUncertainty ? "border-amber-700/35" : "border-transparent",
                  ].join(" ")}
                >
                  <span
                    className="max-w-[30ch] shrink-0 truncate text-xs text-gray-400 opacity-90"
                    title={step.contextSnippet}
                  >
                    {step.contextSnippet}
                  </span>
                  <span className="text-gray-400 opacity-70 select-none" aria-hidden>
                    →
                  </span>
                  <span
                    className={[
                      "min-w-0 shrink font-medium text-gray-900",
                      mediumUncertainty
                        ? "underline decoration-gray-300/90 decoration-1 underline-offset-2"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {step.chosenText || "∅"}{" "}
                    <span className="font-mono text-xs font-normal tabular-nums text-gray-600">
                      ({formatProb(step.chosenProb)})
                    </span>
                  </span>
                  {step.alternates.length > 0 && (
                    <span className="min-w-0 flex-1 text-xs text-gray-500">
                      {step.alternates.map((a, i) => (
                        <span key={`${a.text}-${i}`}>
                          {i > 0 ? <span className="mx-1 text-gray-300">·</span> : null}
                          <span className="font-normal">{a.text || "∅"}</span>{" "}
                          <span className="font-mono tabular-nums text-gray-400">
                            {formatProb(a.prob)}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                  {closeCall && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400 opacity-70">
                      close call
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
