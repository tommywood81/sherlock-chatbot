import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  streamGenerate,
  streamGenerateContinue,
  type StreamMetrics,
  type TokenAlternative,
} from "../api/client";
import {
  buildModelInsight,
  buildTokenMetas,
  filterDecisionPoints,
  getAnswerTokenIndices,
  type TokenWithMeta,
} from "../utils/inferenceAnalytics";
import { parseReasoningOutput, parseStreamedReasoning } from "../utils/reasoning";
import type { BranchCard } from "../components/inference/BranchViewer";

const DEFAULT_SETTINGS = { temperature: 0.7, top_p: 0.9, max_tokens: 64 };

export interface InferenceSettings {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

interface InferenceExperienceValue {
  lastUserPrompt: string | null;
  settings: InferenceSettings;
  setSettings: (s: Partial<InferenceSettings>) => void;
  isStreaming: boolean;
  isBranching: boolean;
  error: string | null;
  streamedText: string;
  tokens: string[];
  tokenMetas: TokenWithMeta[];
  answerMetas: TokenWithMeta[];
  decisionPoints: TokenWithMeta[];
  insight: string;
  finalAnswer: string | null;
  reasoningSteps: string[];
  metrics: StreamMetrics | null;
  exploreMode: boolean;
  setExploreMode: (v: boolean) => void;
  hoveredTokenIndex: number | null;
  setHoveredTokenIndex: (i: number | null) => void;
  pinnedExploreIndex: number | null;
  setPinnedExploreIndex: (i: number | null) => void;
  branches: BranchCard[];
  sendPrompt: (prompt: string) => Promise<void>;
  branchFromToken: (tokenIndex: number, alternativeToken: string) => Promise<void>;
}

const InferenceExperienceContext = createContext<InferenceExperienceValue | null>(null);

export function useInferenceExperience(): InferenceExperienceValue {
  const ctx = useContext(InferenceExperienceContext);
  if (!ctx) throw new Error("useInferenceExperience must be used within provider");
  return ctx;
}

export function InferenceExperienceProvider({ children }: { children: ReactNode }) {
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<InferenceSettings>(DEFAULT_SETTINGS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBranching, setIsBranching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [tokens, setTokens] = useState<string[]>([]);
  const [alternativesByIndex, setAlternativesByIndex] = useState<
    Record<number, TokenAlternative[]>
  >({});
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [exploreMode, setExploreMode] = useState(false);
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);
  const [pinnedExploreIndex, setPinnedExploreIndex] = useState<number | null>(null);
  const [branches, setBranches] = useState<BranchCard[]>([]);
  const accRef = useRef("");

  const setSettings = useCallback((s: Partial<InferenceSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...s }));
  }, []);

  const tokenMetas = useMemo(
    () => buildTokenMetas(tokens, alternativesByIndex),
    [tokens, alternativesByIndex]
  );

  const answerIndices = useMemo(
    () => getAnswerTokenIndices(tokens, streamedText),
    [tokens, streamedText]
  );

  const answerMetas = useMemo(
    () => answerIndices.map((i) => tokenMetas[i]).filter(Boolean),
    [answerIndices, tokenMetas]
  );

  const decisionPoints = useMemo(
    () => filterDecisionPoints(answerMetas).slice(0, 14),
    [answerMetas]
  );

  const insight = useMemo(() => buildModelInsight(answerMetas), [answerMetas]);

  const { steps: reasoningSteps, finalAnswer: streamedFinal, hasAnswerSection } = useMemo(
    () => parseStreamedReasoning(streamedText),
    [streamedText]
  );

  const finalAnswer = useMemo(() => {
    if (!streamedText.trim()) return null;
    if (hasAnswerSection && streamedFinal) return streamedFinal;
    const po = parseReasoningOutput(streamedText);
    if (po.finalAnswer) return po.finalAnswer;
    return streamedText.trim();
  }, [streamedText, hasAnswerSection, streamedFinal]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      setError(null);
      setLastUserPrompt(prompt);
      setStreamedText("");
      setTokens([]);
      setAlternativesByIndex({});
      setMetrics(null);
      setBranches([]);
      setPinnedExploreIndex(null);
      accRef.current = "";
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
            setTokens((prev) => {
              const idx = prev.length;
              if (alternatives?.length) {
                setAlternativesByIndex((a) => ({ ...a, [idx]: alternatives }));
              }
              return [...prev, token];
            });
            accRef.current += token;
            setStreamedText(accRef.current);
          },
          (m) => setMetrics(m)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setIsStreaming(false);
        accRef.current = "";
      }
    },
    [settings.temperature, settings.top_p, settings.max_tokens]
  );

  const branchFromToken = useCallback(
    async (tokenIndex: number, alternativeToken: string) => {
      if (!lastUserPrompt) return;
      const prefix = tokens.slice(0, tokenIndex).join("") + alternativeToken;
      setIsBranching(true);
      setError(null);
      let continuation = "";
      try {
        await streamGenerateContinue(
          {
            prompt: lastUserPrompt,
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
        const parsed = parseReasoningOutput(full);
        const preview =
          parsed.hasAnswerSection && parsed.finalAnswer
            ? parsed.finalAnswer
            : full.slice(0, 800) + (full.length > 800 ? "…" : "");
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `b-${Date.now()}`;
        const label = `Branch after token ${tokenIndex + 1} → «${alternativeToken.slice(0, 24)}${alternativeToken.length > 24 ? "…" : ""}»`;
        setBranches((prev) => [...prev, { id, label, preview }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Branch failed");
      } finally {
        setIsBranching(false);
      }
    },
    [lastUserPrompt, tokens, settings]
  );

  const value: InferenceExperienceValue = {
    lastUserPrompt,
    settings,
    setSettings,
    isStreaming,
    isBranching,
    error,
    streamedText,
    tokens,
    tokenMetas,
    answerMetas,
    decisionPoints,
    insight,
    finalAnswer,
    reasoningSteps,
    metrics,
    exploreMode,
    setExploreMode,
    hoveredTokenIndex,
    setHoveredTokenIndex,
    pinnedExploreIndex,
    setPinnedExploreIndex,
    branches,
    sendPrompt,
    branchFromToken,
  };

  return (
    <InferenceExperienceContext.Provider value={value}>{children}</InferenceExperienceContext.Provider>
  );
}
