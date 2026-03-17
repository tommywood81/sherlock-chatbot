/**
 * Parse model output with [REASONING] and [ANSWER] (or [FINAL ANSWER]) sections.
 */

export interface ParsedReasoning {
  steps: string[];
  finalAnswer: string;
}

const REASONING_MARKERS = ["[REASONING]", "[reasoning]"];
const ANSWER_MARKERS = ["[ANSWER]", "[answer]", "[FINAL ANSWER]", "[final answer]"];

function findFirst(text: string, markers: string[]): { index: number; len: number } | null {
  let best: { index: number; len: number } | null = null;
  for (const m of markers) {
    const i = text.indexOf(m);
    if (i !== -1 && (best === null || i < best.index))
      best = { index: i, len: m.length };
  }
  return best;
}

export function parseReasoningOutput(fullText: string): ParsedReasoning {
  const rStart = findFirst(fullText, REASONING_MARKERS);
  const aStart = findFirst(fullText, ANSWER_MARKERS);

  let reasoningBlock = "";
  let answerBlock = fullText;

  if (rStart && aStart && aStart.index > rStart.index) {
    reasoningBlock = fullText
      .slice(rStart.index + rStart.len, aStart.index)
      .trim();
    answerBlock = fullText.slice(aStart.index + aStart.len).trim();
  } else if (rStart) {
    reasoningBlock = fullText.slice(rStart.index + rStart.len).trim();
  } else if (aStart) {
    answerBlock = fullText.slice(aStart.index + aStart.len).trim();
  }

  const steps = reasoningBlock
    .split(/\n+/)
    .map((s) => s.replace(/^\s*\d+\.\s*/, "").trim())
    .filter(Boolean);
  return { steps, finalAnswer: answerBlock.trim() };
}

export function parseStreamedReasoning(streamedText: string): {
  steps: string[];
  finalAnswer: string | null;
} {
  const { steps, finalAnswer } = parseReasoningOutput(streamedText);
  return { steps, finalAnswer: finalAnswer || null };
}
