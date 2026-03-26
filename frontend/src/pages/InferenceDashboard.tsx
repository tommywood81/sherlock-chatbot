import AskQuestionSection from "../components/inference/AskQuestionSection";
import ModelDetailsDropdown from "../components/inference/ModelDetailsDropdown";
import SystemPromptReveal from "../components/inference/SystemPromptReveal";
import MaxTokensControl from "../components/inference/MaxTokensControl";
import TemperatureControl from "../components/inference/TemperatureControl";
import TopPControl from "../components/inference/TopPControl";
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

  const handleGenerate = (q: string) => {
    const prompt = q.trim();
    setPendingPrompt(prompt);
    void sendPrompt(prompt);
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-cover bg-center bg-no-repeat px-4 py-5 sm:px-6 sm:py-7"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(251, 243, 230, 0.92), rgba(255, 255, 255, 0.88)), url('/background.jpg')",
      }}
    >
      <div className="mx-auto max-w-[920px] space-y-7">
        {/* Hero */}
        <header className="rounded-xl border border-[#ead9bf] bg-white/65 px-4 py-4 shadow-sm backdrop-blur sm:px-5 sm:py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5b2a]">
                Sherlock • Victorian inference desk
              </p>
              <h1 className="font-serif text-[22px] font-semibold leading-tight text-slate-900 sm:text-[26px]">
                Ask a question. Watch a tiny model think in one stream.
              </h1>
              <p className="max-w-[70ch] text-[14px] leading-snug text-slate-700">
                This dashboard streams a single Sherlock-style reply: sharp observations, clear deduction, and a
                confident conclusion—written as one narrative, not split into separate “reasoning” and “answer”
                panels.
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2 sm:mt-0">
              <span className="inline-flex items-center rounded-full border border-[#e6d2b2] bg-[#fff7ea] px-2.5 py-1 text-[12px] font-medium text-[#7a5b2a]">
                Calm. Precise. Victorian.
              </span>
            </div>
          </div>
        </header>

        {error ? <p className="text-[14px] text-red-700">{error}</p> : null}

        {/* Input + preset questions */}
        <AskQuestionSection onGenerate={handleGenerate} isStreaming={busy} />

        {/* Sampling (stacked: temperature → top_p → max_tokens) */}
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3">
          <TemperatureControl settings={settings} onChange={setSettings} disabled={busy} />
          <TopPControl settings={settings} onChange={setSettings} disabled={busy} />
          <MaxTokensControl settings={settings} onChange={setSettings} disabled={busy} />
        </div>

        {/* Model response */}
        {showOutput ? (
          <div className="rounded-xl border border-[#ead9bf] bg-white/70 p-4 shadow-sm backdrop-blur sm:p-5">
            <UnifiedOutputStream
              isStreaming={isStreaming}
              streamText={streamPreview}
              responseText={result?.answer ?? ""}
            />
          </div>
        ) : null}

        {/* Inspection */}
        <section className="space-y-7">
          {showPromptReveal ? <SystemPromptReveal userQuestion={questionText} /> : null}
          {result != null ? <TokenMap answerTokens={result.answerTokens} /> : null}
        </section>

        <ModelDetailsDropdown />
      </div>
    </div>
  );
}
