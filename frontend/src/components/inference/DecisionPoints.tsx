import { useState } from "react";
import type { TokenWithMeta } from "../../utils/inferenceAnalytics";
import { formatTokenForDisplay } from "../../utils/tokenDisplay";

interface DecisionPointsProps {
  points: TokenWithMeta[];
  onPickAlternative: (tokenIndex: number, alternativeToken: string) => void;
  busy?: boolean;
}

export default function DecisionPoints({ points, onPickAlternative, busy }: DecisionPointsProps) {
  const [open, setOpen] = useState<number | null>(null);

  if (!points.length) {
    return (
      <p className="text-sm text-gray-400">
        No notable uncertainty pockets in this answer (thresholds: low top probability, close
        runner-up, or high entropy).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Decision points</h3>
      <ul className="space-y-2">
        {points.map((m) => {
          const sorted = [...m.alternatives].sort(
            (a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0)
          );
          const isOpen = open === m.index;
          return (
            <li
              key={m.index}
              className="rounded-lg border border-gray-100 bg-white overflow-hidden transition-shadow hover:shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.index)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-2"
              >
                <span className="text-sm text-gray-800">
                  Token <span className="font-mono text-gray-900">{formatTokenForDisplay(m.text)}</span>
                </span>
                <span className="text-xs text-gray-400">{isOpen ? "Hide" : "Explore"}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
                  <div className="space-y-2 pt-3">
                    {sorted.slice(0, 5).map((alt, i) => {
                      const p = Number(alt.prob) || 0;
                      const chosen = alt.token === m.text;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span className={`font-mono truncate ${chosen ? "text-gray-900 font-medium" : ""}`}>
                              {formatTokenForDisplay(alt.token)}
                              {chosen && " (chosen)"}
                            </span>
                            <span>{(p * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                chosen ? "bg-gray-800" : "bg-gray-400"
                              }`}
                              style={{ width: `${Math.min(100, p * 100)}%` }}
                            />
                          </div>
                          {!chosen && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onPickAlternative(m.index, alt.token)}
                              className="text-xs text-gray-600 hover:text-gray-900 underline disabled:opacity-40"
                            >
                              Branch from here with this token
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
