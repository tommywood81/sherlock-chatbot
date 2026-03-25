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
  const [showReasoning, setShowReasoning] = useState(false);

  const busy = isStreaming;
  const questionText = (result?.prompt ?? pendingPrompt ?? "").trim();
  const showPromptReveal = questionText.length > 0 && (isStreaming || result != null);
  const showOutput = isStreaming || result != null;

  const reasoningBody =
    result != null ? (result.reasoningRaw.trim() || result.reasoningLines.join("\n")) : "";

  const handleGenerate = (q: string) => {
    const prompt = q.trim();
    setPendingPrompt(prompt);
    const runtimeInstruction = showReasoning
      ? "\n\nProvide the answer followed by a clear, structured explanation of the reasoning. Summarize reasoning concisely without exposing raw chain-of-thought. Focus on key steps that justify the answer. The answer must come first. Do not mention internal mechanics."
      : "\n\nProvide a direct answer only. Do not include reasoning or explanation unless absolutely necessary for clarity. Keep the response concise. Do not mention internal mechanics.";

    void sendPrompt(`${prompt}${runtimeInstruction}`, { showReasoning });
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
              showReasoning={showReasoning}
            />
          </div>
        ) : null}

        {/* Controls + inspection (stacked) */}
        <section className="space-y-7">
          <TemperatureControl settings={settings} onChange={setSettings} disabled={busy} />
          <section className="rounded-lg border border-gray-200 bg-white p-3">
            <label className="flex items-center justify-between gap-3 text-[14px]">
              <span className="font-medium text-slate-900">Show reasoning</span>
              <input
                type="checkbox"
                checked={showReasoning}
                disabled={busy}
                onChange={(e) => setShowReasoning(e.target.checked)}
                className="h-4 w-4 accent-amber-800"
                aria-label="Show reasoning"
              />
            </label>
          </section>
          {showPromptReveal ? (
            <SystemPromptReveal userQuestion={questionText} showReasoning={showReasoning} />
          ) : null}
          {result != null ? <TokenMap answerTokens={result.answerTokens} /> : null}
        </section>

        {/* Model details (collapsed by default) */}
        <ModelDetailsDropdown />
      </div>
    </div>
  );
}
