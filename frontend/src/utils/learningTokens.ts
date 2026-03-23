import type { AnswerTokenRow } from "../types/inferenceTypes";
import { sortTopCandidatesByProb } from "./inferenceAnalytics";

const DEFAULT_MAX = 8;

/**
 * First answer-span token whose chosen text is not the highest-probability candidate.
 */
export function firstNonTopTokenIndex(rows: AnswerTokenRow[]): number | null {
  for (let i = 0; i < rows.length; i++) {
    const sorted = sortTopCandidatesByProb(rows[i].topCandidates);
    if (sorted.length < 2) continue;
    const top = sorted[0]?.token;
    if (top !== undefined && top !== rows[i].text) return i;
  }
  return null;
}

export interface LessonTokenPick {
  rows: AnswerTokenRow[];
  /** Index into `rows` for amber highlight, or null if none */
  highlightIndex: number | null;
}

/**
 * Up to `max` tokens for the lesson: non-top pick first (if any), then fill in order.
 */
export function pickLessonTokenRows(
  answerTokens: AnswerTokenRow[],
  max: number = DEFAULT_MAX
): LessonTokenPick {
  if (answerTokens.length === 0) {
    return { rows: [], highlightIndex: null };
  }
  const nonTop = firstNonTopTokenIndex(answerTokens);
  if (nonTop === null) {
    return {
      rows: answerTokens.slice(0, max),
      highlightIndex: null,
    };
  }
  const used = new Set<number>();
  const rows: AnswerTokenRow[] = [];
  rows.push(answerTokens[nonTop]!);
  used.add(nonTop);
  for (let i = 0; i < answerTokens.length && rows.length < max; i++) {
    if (!used.has(i)) {
      rows.push(answerTokens[i]!);
      used.add(i);
    }
  }
  return { rows, highlightIndex: 0 };
}
