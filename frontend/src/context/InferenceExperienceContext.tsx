import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { streamGenerate, streamGenerateContinue, type StreamMetrics } from "../api/client";
import type { AlternativeBranchData, DemoGenerationResult } from "../types/inferenceDemo";
import {
  buildTokenMetas,
  computeAvgConfidencePercent,
  computeDecisionSensitivityPercent,
  computeTokenConfidence,
  extractDecisionPoint,
  getAnswerTokenIndices,
  getSecondThroughFourthRankedAlternatives,
  pickHighlightTokenTexts,
} from "../utils/inferenceAnalytics";
import { parseReasoningOutput, parseStreamedReasoning } from "../utils/reasoning";

const DEFAULT_SETTINGS = { temperature: 0.7, top_p: 0.9, max_tokens: 64 };

export interface InferenceSettings {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

interface InferenceExperienceValue {
  result: DemoGenerationResult | null;
  streamPreview: string;
  streamMetrics: StreamMetrics | null;
  settings: InferenceSettings;
  setSettings: (s: Partial<InferenceSettings>) => void;
  isStreaming: boolean;
  isAlternativesLoading: boolean;
  error: string | null;
  sendPrompt: (prompt: string) => Promise<void>;
}

const InferenceExperienceContext = createContext<InferenceExperienceValue | null>(null);

export function useInferenceExperience(): InferenceExperienceValue {
  const ctx = useContext(InferenceExperienceContext);
  if (!ctx) throw new Error("useInferenceExperience must be used within provider");
  return ctx;
}

function branchResultText(fullAssistantText: string): string {
  const po = parseReasoningOutput(fullAssistantText);
  if (po.hasAnswerSection && po.finalAnswer) return po.finalAnswer.trim();
  const trimmed = fullAssistantText.trim();
  return trimmed.length > 1200 ? `${trimmed.slice(0, 1200)}…` : trimmed;
}

export function InferenceExperienceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<InferenceSettings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<DemoGenerationResult | null>(null);
  const [streamPreview, setStreamPreview] = useState("");
  const [streamMetrics, setStreamMetrics] = useState<StreamMetrics | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAlternativesLoading, setIsAlternativesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accRef = useRef("");
  const latestMetricsRef = useRef<StreamMetrics | null>(null);

  const setSettings = useCallback((s: Partial<InferenceSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...s }));
  }, []);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      setError(null);
      setResult(null);
      setStreamPreview("");
      setStreamMetrics(null);
      setIsStreaming(true);
      setIsAlternativesLoading(false);

      const tokens: string[] = [];
      const alternativesByIndex: Record<number, import("../api/client").TokenAlternative[]> = {};
      latestMetricsRef.current = null;
      accRef.current = "";

      try {
        await streamGenerate(
          {
            prompt,
            temperature: settings.temperature,
            top_p: settings.top_p,
            max_tokens: settings.max_tokens,
          },
          (token, alternatives) => {
            const idx = tokens.length;
            if (alternatives?.length) {
              alternativesByIndex[idx] = alternatives;
            }
            tokens.push(token);
            accRef.current += token;
            setStreamPreview(accRef.current);
          },
          (m) => {
            latestMetricsRef.current = m;
            setStreamMetrics(m);
          }
        );

        const streamedText = accRef.current;
        const { steps: reasoningSteps, finalAnswer: streamedFinal, hasAnswerSection } =
          parseStreamedReasoning(streamedText);
        const po = parseReasoningOutput(streamedText);
        const finalAnswer =
          hasAnswerSection && streamedFinal
            ? streamedFinal
            : po.finalAnswer ?? streamedText.trim();

        const tokenMetas = buildTokenMetas(tokens, alternativesByIndex);
        const answerIndices = getAnswerTokenIndices(tokens, streamedText);
        const answerMetas = answerIndices.map((i) => tokenMetas[i]).filter(Boolean);

        const highlightTokens = pickHighlightTokenTexts(answerMetas, 2);
        const decision = extractDecisionPoint(answerMetas);
        const metricsSnapshot = latestMetricsRef.current as StreamMetrics | null;
        const latencyMs = Math.round(metricsSnapshot?.latency_ms ?? 0);
        const avgConfidencePct = computeAvgConfidencePercent(answerMetas);
        const decisionSensitivityPct = computeDecisionSensitivityPercent(answerMetas);

        const base: DemoGenerationResult = {
          prompt,
          answer: finalAnswer || "—",
          reasoningSteps,
          highlightTokens,
          alternatives: [],
          divergenceTokenIndex: decision?.index ?? null,
          metrics: {
            latencyMs,
            avgConfidencePct,
            decisionSensitivityPct,
          },
        };

        setStreamPreview("");
        setResult(base);
        setIsStreaming(false);

        if (!decision || !decision.alternatives.length) {
          return;
        }

        const ranked = getSecondThroughFourthRankedAlternatives(decision.alternatives);
        if (ranked.length === 0) return;

        const chosenToken = decision.text;
        const chosenProb = computeTokenConfidence(chosenToken, decision.alternatives);

        setIsAlternativesLoading(true);

        const prefixBase = tokens.slice(0, decision.index).join("");

        const branchPromises = ranked.map(async (alt, i) => {
          const prefix = prefixBase + alt.token;
          let continuation = "";
          await streamGenerateContinue(
            {
              prompt,
              assistant_prefix: prefix,
              temperature: settings.temperature,
              top_p: settings.top_p,
              max_tokens: settings.max_tokens,
            },
            (t) => {
              continuation += t;
            },
            () => {}
          );
          const full = prefix + continuation;
          return {
            pathNumber: i + 1,
            originalToken: chosenToken,
            originalProb: chosenProb,
            altToken: alt.token,
            altProb: Number(alt.prob) || 0,
            result: branchResultText(full),
          } satisfies AlternativeBranchData;
        });

        const alternatives = await Promise.all(branchPromises);
        setResult((prev) =>
          prev
            ? {
                ...prev,
                alternatives,
              }
            : null
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
        setResult(null);
        setStreamPreview("");
      } finally {
        setIsStreaming(false);
        setIsAlternativesLoading(false);
        accRef.current = "";
      }
    },
    [settings.temperature, settings.top_p, settings.max_tokens]
  );

  const value: InferenceExperienceValue = {
    result,
    streamPreview,
    streamMetrics,
    settings,
    setSettings,
    isStreaming,
    isAlternativesLoading,
    error,
    sendPrompt,
  };

  return (
    <InferenceExperienceContext.Provider value={value}>{children}</InferenceExperienceContext.Provider>
  );
}
