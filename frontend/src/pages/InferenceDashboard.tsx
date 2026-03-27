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
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
      }}
    >
      <div className="mx-auto max-w-[920px] space-y-5">
        {/* Hero */}
        <header className="space-y-2 text-left">
          <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
            Sherlock <span style={{ color: "#A66B3A" }}>1B</span>
          </h1>
          <p className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
            Fine-tuning a tiny 1B language model for real-world use.
          </p>
          <p className="max-w-[76ch] text-[14px] leading-snug text-slate-600">
            An example of how fine-tuning can give a language model a distinct persona - built to run
            efficiently without relying on costly APIs.
          </p>
          <p className="max-w-[80ch] text-[13px] leading-snug text-slate-500">
            Demonstrates how companies can deploy lightweight, internal models for chatbots, decision support,
            or knowledge assistants - reducing costs while maintaining full control over data and behavior.
          </p>
        </header>

        {error ? <p className="text-[14px] text-red-700">{error}</p> : null}

        {/* Input + preset questions */}
        <div className="rounded-xl border border-[#ead9bf] bg-white/70 p-3 shadow-sm backdrop-blur sm:p-4">
          <AskQuestionSection onGenerate={handleGenerate} isStreaming={busy} />
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

        {/* Sampling (stacked: temperature → top_p → max_tokens) */}
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-2">
          <TemperatureControl settings={settings} onChange={setSettings} disabled={busy} />
          <TopPControl settings={settings} onChange={setSettings} disabled={busy} />
          <MaxTokensControl settings={settings} onChange={setSettings} disabled={busy} />
        </div>

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
