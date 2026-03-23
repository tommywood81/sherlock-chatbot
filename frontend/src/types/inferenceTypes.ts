import type { TopTokenCandidate } from "../api/client";

/** One answer-span piece with scores for inspection. */
export interface AnswerTokenRow {
  text: string;
  confidence: number;
  topCandidates: TopTokenCandidate[];
}

export interface InferenceModelCard {
  latencyMs: number;
  tokensGenerated: number;
  meanConfidence: number;
  /** Average Shannon entropy (bits) of top-k at each answer step. */
  meanEntropyBits: number;
  /** Mean −log P(chosen token). */
  meanNegLogProb: number;
  /** exp(meanNegLogProb) — rough perplexity proxy from chosen-token probs. */
  approxPerplexity: number;
  answerTokenCount: number;
}

/** One “interesting” next-token step for the insight panel (precomputed per run). */
export interface NotableStep {
  /** Index into `answerTokens` / word-choice buttons. */
  tokenIndex: number;
  /** Short preceding text (end-anchored), for scanability. */
  contextSnippet: string;
  chosenText: string;
  chosenProb: number;
  /** Top other candidates (2–4), by prob desc. */
  alternates: Array<{ text: string; prob: number }>;
  confidence: number;
  /** P(top1) − P(top2) from sorted top-k. */
  top1Top2Margin: number;
}

export interface InferenceRunResult {
  prompt: string;
  answer: string;
  /** Raw lines from [REASONING] (internal). */
  reasoningLines: string[];
  /** Verbatim [REASONING] body (trimmed) for optional disclosure. */
  reasoningRaw: string;
  /** 2–4 plain-English bullets for “Why this answer”. */
  whyThisAnswer: string[];
  answerTokens: AnswerTokenRow[];
  /** Uncertain / close-call steps (inspect: “where the model hesitated”). */
  notableNextTokenSteps: NotableStep[];
  modelCard: InferenceModelCard;
}
