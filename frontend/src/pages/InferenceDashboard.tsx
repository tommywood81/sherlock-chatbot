import FineTuningLesson from "../components/inference/FineTuningLesson";
import PromptSection from "../components/inference/PromptSection";
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

  const handleSubmit = (q: string) => {
    setPendingPrompt(q);
    void sendPrompt(q);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[700px] space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-amber-900">Sherlock</span>
            <span className="text-slate-600"> — How a Model </span>
            <span className="text-sky-800">&quot;Thinks&quot;</span>
          </h1>
          <p className="text-[14px] font-medium text-sky-700/90">
            It generates the output from the prompt, token by token.
          </p>
        </header>

        <section
          className="grid gap-5 md:grid-cols-[1fr,minmax(200px,240px)] md:items-start md:gap-6"
          aria-label="Ask Sherlock"
        >
          <PromptSection onSubmit={handleSubmit} disabled={busy} />
          <TemperatureControl settings={settings} onChange={setSettings} disabled={busy} />
        </section>

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
            <FineTuningLesson />
          </div>
        ) : null}
      </div>
    </div>
  );
}
