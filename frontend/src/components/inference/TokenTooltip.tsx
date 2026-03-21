import type { TokenAlternative } from "../../api/client";
import { formatTokenForDisplay } from "../../utils/tokenDisplay";

interface TokenTooltipProps {
  token: string;
  alternatives: TokenAlternative[];
}

/** Compact hover panel for explore mode (not the old debug card). */
export default function TokenTooltip({ token, alternatives }: TokenTooltipProps) {
  const sorted = [...alternatives].sort(
    (a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0)
  );
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg max-w-md">
      <p className="text-xs text-gray-500 mb-2">Next-token candidates at this step</p>
      <p className="text-sm font-mono text-gray-800 mb-2">{formatTokenForDisplay(token)}</p>
      <ul className="space-y-1.5">
        {sorted.slice(0, 5).map((a, i) => (
          <li key={i} className="flex justify-between gap-3 text-sm">
            <span className="font-mono text-gray-700 truncate">{formatTokenForDisplay(a.token)}</span>
            <span className="text-gray-500 shrink-0">
              {a.prob != null ? `${(a.prob * 100).toFixed(0)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
