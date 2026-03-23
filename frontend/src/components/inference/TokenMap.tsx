import { Fragment, useMemo, useState } from "react";
import type { AnswerTokenRow } from "../../types/inferenceTypes";
import { buildTokenMapMetas } from "../../utils/tokenMap";
import { sortTopCandidatesByProb } from "../../utils/inferenceAnalytics";

interface TokenMapProps {
  answerTokens: AnswerTokenRow[];
}

const MAX_TOOLTIP_CANDIDATES = 4;

function displayToken(text: string): string {
  if (text === " ") return "\u00a0";
  if (text === "\n") return "↵";
  if (!text.trim() && text.length > 0) return "·";
  return text.replace(/\n/g, "↵");
}

function formatProb(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return p.toFixed(2);
}

function pillClasses(kind: "stable" | "decision" | "nontop", emphasized: boolean): string {
  const base =
    "inline-flex max-w-[min(100%,12rem)] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[12px] leading-snug transition-colors tabular-nums";
  if (!emphasized || kind === "stable") {
    return `${base} bg-gray-100/90 text-gray-800 hover:bg-gray-200/90`;
  }
  if (kind === "nontop") {
    return `${base} bg-orange-100/95 text-orange-950 ring-1 ring-orange-300/80 hover:bg-orange-100`;
  }
  return `${base} bg-amber-100/90 text-amber-950 ring-1 ring-amber-200/80 hover:bg-amber-100`;
}

/**
 * Horizontal token strip.
 * Hover/click shows the top 4 next-word candidates for that token step.
 */
export default function TokenMap({ answerTokens }: TokenMapProps) {
  const metas = buildTokenMapMetas(answerTokens);

  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeIndex = pinnedIndex ?? hoveredIndex;
  const activeRow = activeIndex != null ? answerTokens[activeIndex] : null;

  const activeCandidates = useMemo(() => {
    if (!activeRow) return [];
    return sortTopCandidatesByProb(activeRow.topCandidates).slice(0, MAX_TOOLTIP_CANDIDATES);
  }, [activeRow]);

  if (answerTokens.length === 0) {
    return (
      <section className="space-y-1.5" aria-labelledby="token-map-heading">
        <h2
          id="token-map-heading"
          className="border-l-2 border-orange-400 pl-2 text-[14px] font-semibold text-slate-800"
        >
          Token map
        </h2>
        <p className="text-[13px] text-gray-500">
          No scored tokens for this answer — logprobs may be unavailable.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2" aria-labelledby="token-map-heading">
      <h2
        id="token-map-heading"
        className="border-l-2 border-orange-400 pl-2 text-[14px] font-semibold text-slate-800"
      >
        Token map
      </h2>

      <p className="text-[13px] leading-snug text-gray-600">
        Next-word candidates for each token step. Hover or click a word for the top 4.
      </p>

      {activeRow ? (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[12px]" role="status">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-gray-900">Token</span>
            <span className="font-mono text-gray-700">{displayToken(activeRow.text) || "∅"}</span>
          </div>
          <div className="mt-1 text-gray-600">Top {MAX_TOOLTIP_CANDIDATES} candidates</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-gray-800">
            {activeCandidates.length > 0 ? (
              activeCandidates.map((c, idx) => (
                <span key={`${idx}-${c.token}`} className="whitespace-nowrap">
                  {c.token || "∅"} ({formatProb(typeof c.prob === "number" ? c.prob : Number.NaN)})
                </span>
              ))
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
          <div className="mt-1 text-gray-500">Click to pin or unpin.</div>
        </div>
      ) : null}

      <div
        className="-mx-1 flex flex-nowrap items-end gap-x-0 overflow-x-auto overflow-y-visible px-1 py-2 [scrollbar-width:thin]"
        role="list"
        aria-label="Answer token sequence"
      >
        {answerTokens.map((row, i) => {
          const meta = metas[i] ?? { kind: "stable" as const, emphasized: false };
          const isPinned = pinnedIndex === i;

          return (
            <Fragment key={`${i}-${row.text.slice(0, 12)}`}>
              {i > 0 ? (
                <span className="mb-2 shrink-0 select-none self-end text-[10px] text-gray-300" aria-hidden>
                  →
                </span>
              ) : null}
              <div className="flex w-max shrink-0 flex-col items-stretch gap-1" role="listitem">
                <button
                  type="button"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => {
                    if (pinnedIndex == null) setHoveredIndex(null);
                  }}
                  onClick={() => setPinnedIndex((prev) => (prev === i ? null : i))}
                  className="focus:outline-none"
                  aria-pressed={isPinned}
                  aria-label={`Token ${i + 1}: ${displayToken(row.text) || "∅"}`}
                >
                  <span className={`${pillClasses(meta.kind, meta.emphasized)} self-center`}>
                    {displayToken(row.text) || "∅"}
                    {isPinned ? (
                      <span className="ml-2 text-[10px] font-sans font-semibold text-gray-500">•</span>
                    ) : null}
                  </span>
                </button>
                <div className="min-h-[2.25rem] w-full max-w-[5.5rem] px-0.5">
                  {meta.emphasized && meta.kind === "nontop" ? (
                    <p className="text-center text-[9px] font-semibold leading-tight text-red-800">
                      not the top choice
                    </p>
                  ) : null}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
