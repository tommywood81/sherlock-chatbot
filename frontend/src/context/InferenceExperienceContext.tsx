import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  streamGenerate,
  validateSamplingParamsAgainstMetrics,
  type StreamMetrics,
} from "../api/client";
import type { InferenceRunResult } from "../types/inferenceTypes";
import { buildInferenceRunResult } from "../services/inferenceRun";

const DEFAULT_SETTINGS = { temperature: 0.5, top_p: 0.9, max_tokens: 256 };

export interface InferenceSettings {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

interface InferenceExperienceValue {
  result: InferenceRunResult | null;
  streamPreview: string;
  streamMetrics: StreamMetrics | null;
  settings: InferenceSettings;
  setSettings: (s: Partial<InferenceSettings>) => void;
  isStreaming: boolean;
  error: string | null;
  sendPrompt: (prompt: string) => Promise<void>;
}

const InferenceExperienceContext = createContext<InferenceExperienceValue | null>(null);

export function useInferenceExperience(): InferenceExperienceValue {
  const ctx = useContext(InferenceExperienceContext);
  if (!ctx) throw new Error("useInferenceExperience must be used within provider");
  return ctx;
}

export function InferenceExperienceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<InferenceSettings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<InferenceRunResult | null>(null);
  const [streamPreview, setStreamPreview] = useState("");
  const [streamMetrics, setStreamMetrics] = useState<StreamMetrics | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
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
      const clientStart = performance.now();

      const tokens: string[] = [];
      const candidatesByIndex: Record<number, import("../api/client").TopTokenCandidate[]> = {};
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
          (token, topCandidates) => {
            const idx = tokens.length;
            if (topCandidates?.length) {
              candidatesByIndex[idx] = topCandidates;
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
        const latencyMsClient = Math.round(performance.now() - clientStart);

        const paramCheck = validateSamplingParamsAgainstMetrics(settings, latestMetricsRef.current);
        if (!paramCheck.ok) {
          setError(paramCheck.message);
          setResult(null);
          setStreamPreview("");
          return;
        }

        const run = buildInferenceRunResult({
          prompt,
          tokens,
          candidatesByIndex,
          streamedText,
          streamMetrics: latestMetricsRef.current,
          latencyMsClient,
        });

        setStreamPreview("");
        setResult(run);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
        setResult(null);
        setStreamPreview("");
      } finally {
        setIsStreaming(false);
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
    error,
    sendPrompt,
  };

  return (
    <InferenceExperienceContext.Provider value={value}>{children}</InferenceExperienceContext.Provider>
  );
}
