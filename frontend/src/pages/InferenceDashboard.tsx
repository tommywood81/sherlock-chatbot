import { useCallback, useEffect, useState } from "react";
import CompactModelControls from "../components/inference/CompactModelControls";
import InspectableAnswer from "../components/inference/InspectableAnswer";
import InspectGenerationToggle from "../components/inference/InspectGenerationToggle";
import ModelMetricsSection from "../components/inference/ModelMetricsSection";
import NextTokenProbabilitiesSection from "../components/inference/NextTokenProbabilitiesSection";
import PromptSection from "../components/inference/PromptSection";
import WhyThisAnswer from "../components/inference/WhyThisAnswer";
import { useInferenceExperience } from "../context/InferenceExperienceContext";

const EMPTY_TOKENS: never[] = [];

export default function InferenceDashboard() {
  const {
    sendPrompt,
    settings,
    setSettings,
    isStreaming,
    error,
    result,
    streamPreview,
    streamMetrics,
  } = useInferenceExperience();

  const [inspectMode, setInspectMode] = useState(false);
  const [externalOpenToken, setExternalOpenToken] = useState<{
    index: number;
    nonce: number;
  } | null>(null);

  const clearExternalOpenToken = useCallback(() => setExternalOpenToken(null), []);

  useEffect(() => {
    setInspectMode(false);
  }, [result]);

  const heroAnswer = result?.answer ?? (streamPreview || null);
  const answerTokens = result?.answerTokens ?? EMPTY_TOKENS;
  const busy = isStreaming;
  const showBody = result != null || isStreaming;
  const inspectActive = inspectMode && !isStreaming && result != null;

  return (
    <div className="min-h-[calc(100vh-4rem)] px-5 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        <PromptSection onSubmit={sendPrompt} disabled={busy} />

        {showBody && (
          <>
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Answer
              </h2>
              <InspectableAnswer
                answerPlain={heroAnswer}
                tokens={answerTokens}
                inspectMode={inspectActive}
                isStreaming={isStreaming}
                externalOpenToken={externalOpenToken}
                onExternalOpenConsumed={clearExternalOpenToken}
                belowWordChoices={
                  inspectActive && result ? (
                    <NextTokenProbabilitiesSection
                      steps={result.notableNextTokenSteps}
                      onSelectTokenIndex={(idx) =>
                        setExternalOpenToken({ index: idx, nonce: Date.now() })
                      }
                    />
                  ) : null
                }
              />
            </section>

            {!isStreaming && result != null && (
              <InspectGenerationToggle
                enabled={inspectMode}
                onChange={setInspectMode}
              />
            )}

            {inspectActive && (
              <div className="space-y-8 border-t border-gray-100 pt-8">
                <WhyThisAnswer bullets={result.whyThisAnswer} />
                <CompactModelControls
                  settings={settings}
                  onChange={setSettings}
                  disabled={busy}
                />
              </div>
            )}

            {result != null && (
              <ModelMetricsSection
                card={result.modelCard}
                streamConfidence={streamMetrics?.confidence ?? null}
              />
            )}
          </>
        )}

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
