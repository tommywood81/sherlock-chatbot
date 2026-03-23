import type { NotableStep } from "../../types/inferenceTypes";

function probLabel(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return p.toFixed(2);
}

interface WhereModelHesitatedProps {
  steps: NotableStep[];
}

/**
 * Compact list of hesitant steps (no cards, tables, or heavy chrome).
 */
export default function WhereModelHesitated({ steps }: WhereModelHesitatedProps) {
  if (steps.length === 0) {
    return (
      <p className="text-[15px] leading-relaxed text-gray-500">
        No uncertain steps stood out in this answer.
      </p>
    );
  }

  return (
    <ul className="space-y-5 list-none p-0 m-0">
        {steps.map((s) => (
          <li key={s.tokenIndex} className="text-[15px] leading-snug">
            <div className="text-gray-900">
              <span className="font-medium">{s.chosenText || "∅"}</span>
              <span className="text-gray-500 font-mono text-[14px] tabular-nums"> ({probLabel(s.chosenProb)})</span>
            </div>
            {s.alternates.length > 0 ? (
              <p className="mt-1 text-[13px] text-gray-500 font-mono tabular-nums">
                {s.alternates.map((a, i) => (
                  <span key={`${s.tokenIndex}-${i}`}>
                    {i > 0 ? <span className="text-gray-300"> · </span> : null}
                    {a.text || "∅"} ({probLabel(a.prob)})
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        ))}
    </ul>
  );
}
