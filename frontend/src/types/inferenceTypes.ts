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

export interface InferenceRunResult {
  prompt: string;
  answer: string;
  /** Raw lines from [REASONING] (internal). */
  reasoningLines: string[];
  /** 2–4 plain-English bullets for “Why this answer”. */
  whyThisAnswer: string[];
  answerTokens: AnswerTokenRow[];
  modelCard: InferenceModelCard;
}
