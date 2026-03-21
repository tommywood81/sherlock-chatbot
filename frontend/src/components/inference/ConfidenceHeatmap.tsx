import { memo, useMemo } from "react";
import type { TokenWithMeta } from "../../utils/inferenceAnalytics";
import { heatmapBackgroundStyle, normalizeConfidencesForHeatmap } from "../../utils/inferenceAnalytics";

export interface ConfidenceHeatmapProps {
  answerMetas: TokenWithMeta[];
  exploreMode: boolean;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onTokenClick: (index: number) => void;
}

function ConfidenceHeatmapInner({
  answerMetas,
  exploreMode,
  hoveredIndex,
  onHover,
  onTokenClick,
}: ConfidenceHeatmapProps) {
  const norms = useMemo(
    () => normalizeConfidencesForHeatmap(answerMetas.map((m) => m.confidence)),
    [answerMetas]
  );

  if (!answerMetas.length) {
    return (
      <p className="text-sm text-gray-400">
        Confidence shading appears after the model returns an answer section.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Confidence in the answer
      </h3>
      <p className="text-xs text-gray-400 mb-2">
        Darker shading = higher confidence for that subword. Subtle grey only.
      </p>
      <p className="text-base leading-relaxed text-gray-900 flex flex-wrap gap-y-1">
        {answerMetas.map((m, i) => {
          const style = heatmapBackgroundStyle(norms[i] ?? 0.5);
          const active = exploreMode && hoveredIndex === m.index;
          const className = `rounded px-0.5 py-0.5 transition-all duration-150 ${
            exploreMode ? "cursor-pointer hover:ring-1 hover:ring-gray-300" : ""
          } ${active ? "ring-1 ring-gray-400" : ""}`;
          return (
            <span key={`t-${m.index}`} className="inline">
              {exploreMode ? (
                <button
                  type="button"
                  onMouseEnter={() => onHover(m.index)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onTokenClick(m.index)}
                  style={style}
                  className={className}
                >
                  {m.text}
                </button>
              ) : (
                <span style={style} className={className}>
                  {m.text}
                </span>
              )}
            </span>
          );
        })}
      </p>
    </div>
  );
}

export default memo(ConfidenceHeatmapInner);
