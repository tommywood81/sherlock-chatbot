import AskQuestionSection from "../components/inference/AskQuestionSection";
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
    <div className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[min(100%,840px)] space-y-8">
        <AskQuestionSection onGenerate={handleGenerate} isStreaming={busy} />
        <TemperatureControl settings={settings} onChange={setSettings} disabled={busy} />

        {error ? <p className="text-[14px] text-red-700">{error}</p> : null}

        {showPromptReveal ? <SystemPromptReveal userQuestion={questionText} /> : null}

        {showOutput ? (
          <UnifiedOutputStream
            isStreaming={isStreaming}
            streamText={streamPreview}
            reasoningText={reasoningBody}
            answerText={result?.answer ?? ""}
          />
        ) : null}

        {result != null ? (
          <div className="space-y-6">
            <TokenMap answerTokens={result.answerTokens} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
