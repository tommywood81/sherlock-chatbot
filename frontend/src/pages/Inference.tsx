import { useState, useCallback, useRef } from "react";
import { streamGenerate, type StreamMetrics } from "../api/client";
import { parseStreamedReasoning } from "../utils/reasoning";
import type { Message } from "../components/ChatWindow";
import ChatWindow from "../components/ChatWindow";
import PromptInput from "../components/PromptInput";
import ReasoningPanel from "../components/ReasoningPanel";
import TokenStream from "../components/TokenStream";
import MetricsPanel from "../components/MetricsPanel";
import SettingsPanel from "../components/SettingsPanel";

const DEFAULT_SETTINGS = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 64,
};

export default function Inference() {
  const [currentUserMessage, setCurrentUserMessage] = useState<string | null>(null);
  const [assistantDisplayText, setAssistantDisplayText] = useState<string | null>(null);
  const [streamingTokens, setStreamingTokens] = useState<string[]>([]);
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
          (token) => {
            setStreamingTokens((t) => [...t, token]);
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
    <div className="flex gap-6 p-6 max-w-7xl mx-auto h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <section>
          <PromptInput
            onSend={handleSend}
            disabled={isStreaming}
            placeholder="Ask Sherlock… (reasoning and answer will appear below)"
          />
        </section>
        <section className="min-h-0 flex-1 flex flex-col gap-4 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Chat
          </h2>
          <div className="grid grid-rows-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3 h-full">
            <div className="min-h-0 overflow-auto">
              <ChatWindow messages={displayMessages} isStreaming={isStreaming} />
            </div>
            <div className="min-h-0 overflow-auto">
              <ReasoningPanel
                steps={reasoningSteps}
                finalAnswer={reasoningAnswer}
                isStreaming={isStreaming}
              />
            </div>
            <div className="min-h-0 overflow-auto">
              <TokenStream tokens={streamingTokens} isStreaming={isStreaming} />
            </div>
          </div>
        </section>
        {error && (
          <p className="text-red-600 text-sm rounded border border-red-200 bg-red-50 px-3 py-2">
            {error}
          </p>
        )}
      </div>
      <aside className="w-64 flex-shrink-0 space-y-4">
        <SettingsPanel
          settings={settings}
          onChange={(s) => setSettings((prev) => ({ ...prev, ...s }))}
        />
        <MetricsPanel metrics={metrics} />
      </aside>
    </div>
  );
}
