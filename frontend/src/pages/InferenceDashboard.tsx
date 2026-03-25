import AskQuestionSection from "../components/inference/AskQuestionSection";
import ModelDetailsDropdown from "../components/inference/ModelDetailsDropdown";
import SystemPromptReveal from "../components/inference/SystemPromptReveal";
import TemperatureControl from "../components/inference/TemperatureControl";
import TokenMap from "../components/inference/TokenMap";
import UnifiedOutputStream from "../components/inference/UnifiedOutputStream";
import { useInferenceExperience } from "../context/InferenceExperienceContext";
import { useState } from "react";

export default function InferenceDashboard() {
  const { sendPrompt, settings, setSettings, isStreaming, error, result, streamPreview } =
    useInferenceExperience();

  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const busy = isStreaming;
  const questionText = (result?.prompt ?? pendingPrompt ?? "").trim();
  const showPromptReveal = questionText.length > 0 && (isStreaming || result != null);
  const showOutput = isStreaming || result != null;

  const reasoningBody =
    result != null ? (result.reasoningRaw.trim() || result.reasoningLines.join("\n")) : "";

  const handleGenerate = (q: string) => {
    setPendingPrompt(q);
    void sendPrompt(q);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[900px] space-y-7">
        {error ? <p className="text-[14px] text-red-700">{error}</p> : null}

        {/* Input + preset questions */}
        <AskQuestionSection onGenerate={handleGenerate} isStreaming={busy} />

        {/* Model response */}
        {showOutput ? (
          <div className="rounded-lg bg-slate-50/60 p-4 sm:p-5">
            <UnifiedOutputStream
              isStreaming={isStreaming}
              streamText={streamPreview}
              reasoningText={reasoningBody}
              answerText={result?.answer ?? ""}
            />
          </div>
        ) : null}

        {/* Controls + inspection (stacked) */}
        <section className="space-y-7">
          <TemperatureControl settings={settings} onChange={setSettings} disabled={busy} />
          {showPromptReveal ? <SystemPromptReveal userQuestion={questionText} /> : null}
          {result != null ? <TokenMap answerTokens={result.answerTokens} /> : null}
        </section>

        {/* Model details (collapsed by default) */}
        <ModelDetailsDropdown />
      </div>
    </div>
  );
}
