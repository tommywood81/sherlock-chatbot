import type { TokenAlternative } from "../api/client";
import { formatTokenForDisplay, mergeAlternativesWithSameDisplay } from "../utils/tokenDisplay";

interface TokenTooltipProps {
  token: string;
  alternatives?: TokenAlternative[];
}

export default function TokenTooltip({ token, alternatives }: TokenTooltipProps) {
  const merged =
    alternatives && alternatives.length > 0
      ? mergeAlternativesWithSameDisplay(alternatives).slice(0, 5)
      : [];

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500 mb-2 leading-relaxed">
        <strong className="text-gray-600">Per-step top‑5:</strong> raw tokenizer pieces for the{" "}
        <em>next</em> subword (not full words). <span className="whitespace-nowrap">↵ newline</span>
        , <span className="whitespace-nowrap">· space</span>, <span className="whitespace-nowrap">⇥ tab</span>
        . The model picked one row; percentages are for this step only.{" "}
        <strong className="text-gray-600">Confidence</strong> in the sidebar averages these
        across the reply.
      </p>
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Selected subword</div>
      <div
        className="font-mono text-sm text-gray-900 mb-3 break-all"
        title={JSON.stringify(token)}
      >
        {formatTokenForDisplay(token)}
      </div>

      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Top alternatives (same step)</div>
      {merged.length > 0 ? (
        <ul className="space-y-1">
          {merged.map((alt, i) => (
            <li key={`${alt.token}-${i}`} className="flex justify-between gap-3 text-sm">
              <span className="font-mono text-gray-800 break-all" title={JSON.stringify(alt.token)}>
                {formatTokenForDisplay(alt.token)}
              </span>
              <span className="text-gray-500 shrink-0">
                {alt.prob != null ? `${(alt.prob * 100).toFixed(1)}%` : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">
          Alternatives are not available for this run. Enable token logprobs/top-k in backend
          output to populate this panel.
        </p>
      )}
    </div>
  );
}

