import { useState, useCallback, useRef } from "react";
import { streamGenerate, type StreamMetrics, type TokenAlternative } from "../api/client";
import { parseStreamedReasoning } from "../utils/reasoning";
import type { Message } from "../components/ChatWindow";
import ChatWindow from "../components/ChatWindow";
import PromptInput from "../components/PromptInput";
import ReasoningPanel from "../components/ReasoningPanel";
import TokenStream from "../components/TokenStream";
import MetricsPanel from "../components/MetricsPanel";
import SettingsPanel from "../components/SettingsPanel";
import ExplanationHint from "../components/ExplanationHint";

const DEFAULT_SETTINGS = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 64,
};

export default function Inference() {
  const [currentUserMessage, setCurrentUserMessage] = useState<string | null>(null);
  const [assistantDisplayText, setAssistantDisplayText] = useState<string | null>(null);
  const [streamingTokens, setStreamingTokens] = useState<string[]>([]);
  const [tokenAlternativesByIndex, setTokenAlternativesByIndex] = useState<Record<number, TokenAlternative[]>>({});
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [reasoningAnswer, setReasoningAnswer] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamedTextRef = useRef("");

  const handleSend = useCallback(
    async (prompt: string) => {
      setError(null);
      // Reset view to a single-turn exchange.
      setCurrentUserMessage(prompt);
      setAssistantDisplayText(null);
      setStreamingTokens([]);
      setTokenAlternativesByIndex({});
      setReasoningSteps([]);
      setReasoningAnswer(null);
      streamedTextRef.current = "";
      setIsStreaming(true);
      try {
        await streamGenerate(
          {
            prompt,
            temperature: settings.temperature,
            top_p: settings.top_p,
            max_tokens: settings.max_tokens,
          },
          (token, alternatives) => {
            setStreamingTokens((t) => {
              const idx = t.length;
              if (alternatives && alternatives.length > 0) {
                setTokenAlternativesByIndex((prev) => ({ ...prev, [idx]: alternatives }));
              }
              return [...t, token];
            });
            streamedTextRef.current += token;
            const { steps, finalAnswer, hasAnswerSection } = parseStreamedReasoning(
              streamedTextRef.current,
            );
            setReasoningSteps(steps);
            setReasoningAnswer(finalAnswer);
            if (hasAnswerSection) {
              setAssistantDisplayText(finalAnswer);
            } else if (steps.length > 0) {
              setAssistantDisplayText("Waiting for [ANSWER]…");
            } else {
              setAssistantDisplayText(streamedTextRef.current);
            }
          },
          (m) => setMetrics(m)
        );
        // Final parse pass: ensures the reasoning panel is correct even if the
        // last streamed chunk arrives right at stream end.
        const finalText = streamedTextRef.current;
        const { steps, finalAnswer, hasAnswerSection } =
          parseStreamedReasoning(finalText);
        setReasoningSteps(steps);
        setReasoningAnswer(finalAnswer);
        if (hasAnswerSection) {
          setAssistantDisplayText(finalAnswer);
        } else if (steps.length > 0) {
          setAssistantDisplayText("Waiting for [ANSWER]…");
        } else {
          setAssistantDisplayText(finalText);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setIsStreaming(false);
        streamedTextRef.current = "";
      }
    },
    [settings]
  );

  const displayMessages: Message[] = [
    ...(currentUserMessage ? [{ role: "user" as const, content: currentUserMessage }] : []),
    ...(assistantDisplayText
      ? [{ role: "assistant" as const, content: assistantDisplayText }]
      : []),
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <section>
          <PromptInput
            onSend={handleSend}
            disabled={isStreaming}
            placeholder="Ask Sherlock… (reasoning and answer will appear below)"
          />
        </section>
        {/* Stack sections vertically so the document can scroll; avoid fixed-height grids that clip the bottom */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Chat
          </h2>
          <ExplanationHint />
          <div className="max-h-[min(40vh,320px)] overflow-y-auto rounded-lg">
            <ChatWindow messages={displayMessages} isStreaming={isStreaming} />
          </div>
          <div className="max-h-[min(40vh,320px)] overflow-y-auto">
            <ReasoningPanel
              steps={reasoningSteps}
              finalAnswer={reasoningAnswer}
              isStreaming={isStreaming}
            />
          </div>
          <TokenStream
            tokens={streamingTokens}
            isStreaming={isStreaming}
            tokenAlternatives={tokenAlternativesByIndex}
            autoSelectAlternatives={true}
          />
        </section>
        {error && (
          <p className="text-red-600 text-sm rounded border border-red-200 bg-red-50 px-3 py-2">
            {error}
          </p>
        )}
      </div>
      <aside className="w-full lg:w-64 flex-shrink-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
        <SettingsPanel
          settings={settings}
          onChange={(s) => setSettings((prev) => ({ ...prev, ...s }))}
        />
        <MetricsPanel metrics={metrics} />
      </aside>
    </div>
  );
}
