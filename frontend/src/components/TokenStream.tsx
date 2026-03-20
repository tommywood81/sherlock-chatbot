import { useEffect, useMemo, useState } from "react";
import type { TokenAlternative } from "../api/client";
import { formatTokenForDisplay } from "../utils/tokenDisplay";
import TokenTooltip from "./TokenTooltip";

interface TokenStreamProps {
  tokens: string[];
  isStreaming?: boolean;
  tokenAlternatives?: Record<number, TokenAlternative[]>;
  /**
   * When false, the tooltip will only appear after the user clicks a token.
   * When true, we auto-select the last token that has alternatives once streaming ends.
   */
  autoSelectAlternatives?: boolean;
}

export default function TokenStream({
  tokens,
  isStreaming,
  tokenAlternatives,
  autoSelectAlternatives = true,
}: TokenStreamProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // When a new generation starts, clear the selection so we can re-auto-select later.
  useEffect(() => {
    if (isStreaming) setSelectedIndex(null);
  }, [isStreaming]);

  // Auto-open the tooltip after generation so probabilities/top-k are visible immediately.
  useEffect(() => {
    if (!autoSelectAlternatives) return;
    if (isStreaming) return;
    if (selectedIndex != null) return;
    if (!tokenAlternatives) return;

    const indices = Object.keys(tokenAlternatives)
      .map((k) => Number(k))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < tokens.length);

    if (indices.length === 0) return;

    // Choose the last token with alternatives so it corresponds to the end of the response.
    const bestIndex = Math.max(...indices);
    setSelectedIndex(bestIndex);
  }, [autoSelectAlternatives, isStreaming, selectedIndex, tokenAlternatives, tokens.length]);

  const selectedToken = useMemo(() => {
    if (selectedIndex == null) return null;
    return tokens[selectedIndex] ?? null;
  }, [selectedIndex, tokens]);

  const selectedAlternatives = useMemo(() => {
    if (selectedIndex == null) return undefined;
    return tokenAlternatives?.[selectedIndex];
  }, [selectedIndex, tokenAlternatives]);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-3 min-h-0">
      {/* Top section first so it stays visible without scrolling past long token rows */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
          Top 5 alternative tokens
        </h4>
        {selectedToken != null ? (
          <TokenTooltip token={selectedToken} alternatives={selectedAlternatives} />
        ) : (
          <p className="text-xs text-gray-400 rounded-md border border-dashed border-gray-300 bg-white px-3 py-2">
            Run a prompt, then click a token below (or wait for auto-select) to see top alternatives.
          </p>
        )}
      </div>
      <div className="min-h-0 flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Token stream</h3>
          <span className="text-[11px] text-gray-400">Tip: Click any word to explore other possible outputs.</span>
        </div>
        <p className="font-mono text-sm text-gray-700 break-all max-h-[min(40vh,240px)] overflow-y-auto">
          {tokens.length === 0 && !isStreaming ? (
            <span className="text-gray-400">Tokens will appear here as they are generated.</span>
          ) : (
            tokens.map((t, i) => (
              <span key={i}>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`text-left ${selectedIndex === i ? "text-blue-700 underline decoration-blue-300" : "text-gray-800 hover:text-blue-700"}`}
                  title={JSON.stringify(t)}
                >
                  {formatTokenForDisplay(t)}
                </button>
                {i < tokens.length - 1 ? " | " : ""}
              </span>
            ))
          )}
          {isStreaming && tokens.length > 0 && (
            <span className="inline-block h-3 w-1.5 ml-0.5 align-middle bg-gray-400 animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}
