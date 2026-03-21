import { useMemo } from "react";
import MetricsPanel from "../components/MetricsPanel";
import SettingsPanel from "../components/SettingsPanel";
import AlternativeAnswers from "../components/inference/AlternativeAnswers";
import AnswerView from "../components/inference/AnswerView";
import InsightPanel from "../components/inference/InsightPanel";
import PromptSection from "../components/inference/PromptSection";
import ReasoningPanel from "../components/inference/ReasoningPanel";
import { useInferenceExperience } from "../context/InferenceExperienceContext";
import { parseStreamedReasoning } from "../utils/reasoning";

export default function InferenceDashboard() {
  const {
    sendPrompt,
    settings,
    setSettings,
    isStreaming,
    isAlternativesLoading,
    error,
    result,
    streamPreview,
    streamMetrics,
  } = useInferenceExperience();

  const busy = isStreaming || isAlternativesLoading;
  const showBody = result != null || isStreaming;
  const heroAnswer = result?.answer ?? (streamPreview || null);

  const reasoningSteps = useMemo(() => {
    if (result?.reasoningSteps?.length) return result.reasoningSteps;
    if (isStreaming && streamPreview)
      return parseStreamedReasoning(streamPreview).steps;
    return [];
  }, [result?.reasoningSteps, isStreaming, streamPreview]);

  return (
    <div className="flex flex-col lg:flex-row gap-12 p-6 max-w-5xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col gap-10 min-w-0">
        <PromptSection onSubmit={sendPrompt} disabled={busy} />

        {showBody && (
          <>
            <AnswerView
              answer={heroAnswer}
              highlightTokens={isStreaming ? [] : (result?.highlightTokens ?? [])}
              isStreaming={isStreaming}
            />

            <ReasoningPanel steps={reasoningSteps} isStreaming={isStreaming} />

            <InsightPanel />

            {result != null && (
              <AlternativeAnswers
                alternatives={result.alternatives}
                loading={isAlternativesLoading}
                hasDivergence={result.divergenceTokenIndex != null}
              />
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
      </div>

      <aside className="w-full lg:w-64 shrink-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
        <SettingsPanel settings={settings} onChange={setSettings} />
        <MetricsPanel streamMetrics={streamMetrics} demoMetrics={result?.metrics ?? null} />
      </aside>
    </div>
  );
}
