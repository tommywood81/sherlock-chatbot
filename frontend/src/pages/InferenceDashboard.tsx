import MetricsPanel from "../components/MetricsPanel";
import SettingsPanel from "../components/SettingsPanel";
import AnswerView from "../components/inference/AnswerView";
import BranchViewer from "../components/inference/BranchViewer";
import ConfidenceHeatmap from "../components/inference/ConfidenceHeatmap";
import DecisionPoints from "../components/inference/DecisionPoints";
import ExploreToggle from "../components/inference/ExploreToggle";
import ModelInsightPanel from "../components/inference/ModelInsightPanel";
import PromptSection from "../components/inference/PromptSection";
import ReasoningCollapsible from "../components/inference/ReasoningCollapsible";
import TokenTooltip from "../components/inference/TokenTooltip";
import { useInferenceExperience } from "../context/InferenceExperienceContext";

export default function InferenceDashboard() {
  const {
    sendPrompt,
    settings,
    setSettings,
    isStreaming,
    isBranching,
    error,
    finalAnswer,
    reasoningSteps,
    insight,
    answerMetas,
    decisionPoints,
    metrics,
    exploreMode,
    setExploreMode,
    hoveredTokenIndex,
    setHoveredTokenIndex,
    pinnedExploreIndex,
    setPinnedExploreIndex,
    branchFromToken,
    tokenMetas,
    branches,
  } = useInferenceExperience();

  const pinnedMeta =
    pinnedExploreIndex != null ? tokenMetas.find((m) => m.index === pinnedExploreIndex) : null;
  const hoverMeta =
    hoveredTokenIndex != null ? tokenMetas.find((m) => m.index === hoveredTokenIndex) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-10 p-6 max-w-5xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col gap-10 min-w-0">
        <PromptSection onSubmit={sendPrompt} disabled={isStreaming || isBranching} />

        <ExploreToggle enabled={exploreMode} onChange={setExploreMode} />

        <AnswerView answer={finalAnswer} isStreaming={isStreaming} />

        {insight && <ModelInsightPanel text={insight} />}

        <ConfidenceHeatmap
          answerMetas={answerMetas}
          exploreMode={exploreMode}
          hoveredIndex={hoveredTokenIndex}
          onHover={setHoveredTokenIndex}
          onTokenClick={(idx) => setPinnedExploreIndex(pinnedExploreIndex === idx ? null : idx)}
        />

        {exploreMode && (hoverMeta?.alternatives?.length || pinnedMeta?.alternatives?.length) ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            {pinnedMeta && pinnedMeta.alternatives.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Picked token — choose an alternative to branch
                </p>
                <TokenTooltip token={pinnedMeta.text} alternatives={pinnedMeta.alternatives} />
                <div className="flex flex-wrap gap-2">
                  {[...pinnedMeta.alternatives]
                    .sort((a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0))
                    .slice(0, 5)
                    .filter((a) => a.token !== pinnedMeta.text)
                    .map((a) => (
                      <button
                        key={a.token}
                        type="button"
                        disabled={isBranching}
                        onClick={() => branchFromToken(pinnedMeta.index, a.token)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-mono text-gray-800 hover:border-gray-400 disabled:opacity-40"
                      >
                        Continue with «{a.token.slice(0, 20)}
                        {a.token.length > 20 ? "…" : ""}»
                      </button>
                    ))}
                </div>
              </div>
            ) : hoverMeta && hoverMeta.alternatives.length > 0 ? (
              <TokenTooltip token={hoverMeta.text} alternatives={hoverMeta.alternatives} />
            ) : null}
          </div>
        ) : null}

        <DecisionPoints
          points={decisionPoints}
          onPickAlternative={branchFromToken}
          busy={isBranching}
        />

        <BranchViewer branches={branches} />

        <ReasoningCollapsible steps={reasoningSteps} isStreaming={isStreaming} />

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
      </div>

      <aside className="w-full lg:w-56 shrink-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
        <SettingsPanel settings={settings} onChange={setSettings} />
        <MetricsPanel metrics={metrics} />
      </aside>
    </div>
  );
}
