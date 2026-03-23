import type { AnswerTokenRow } from "../types/inferenceTypes";
import { sortTopCandidatesByProb } from "./inferenceAnalytics";

export const MAX_TOKEN_MAP_HIGHLIGHTS = 8;

export type TokenMapKind = "stable" | "decision" | "nontop";

export interface TokenMapMeta {
  kind: TokenMapKind;
  /** True if this index is in the capped highlight set (may differ from kind for overflow). */
  emphasized: boolean;
}

const PROB_NOISE_HIGH = 0.995;
const PROB_NOISE_LOW = 0.005;
const DECISION_CONF = 0.6;
const DECISION_MARGIN = 0.1;

/**
 * Hide near-0 / near-1 probabilities in tooltips (no signal).
 */
export function shouldShowProb(p: number): boolean {
  if (!Number.isFinite(p)) return false;
  return p > PROB_NOISE_LOW && p < PROB_NOISE_HIGH;
}

/**
 * Top candidates for tooltip: at most 3, sorted by prob; omits useless probability text.
 */
export function formatCandidateTooltip(row: AnswerTokenRow): string {
  const sorted = sortTopCandidatesByProb(row.topCandidates).slice(0, 3);
  if (sorted.length === 0) return "";

  const parts = sorted.map((c) => {
    const tok = (c.token ?? "").replace(/\s+/g, " ").trim() || "∅";
    const p = Number(c.prob);
    if (!shouldShowProb(p)) return tok;
    return `${tok} (${p.toFixed(2)})`;
  });
  return parts.join(" · ");
}

function classifyRow(row: AnswerTokenRow): { kind: TokenMapKind; sortKey: number } {
  const sorted = sortTopCandidatesByProb(row.topCandidates);
  if (sorted.length < 2) {
    return { kind: "stable", sortKey: 0 };
  }

  const top = sorted[0]!;
  const second = sorted[1]!;
  const p0 = Number(top.prob) || 0;
  const p1 = Number(second.prob) || 0;
  const margin = p0 - p1;
  const isNonTop = top.token !== row.text;
  if (isNonTop) {
    return { kind: "nontop", sortKey: 100 + (1 - row.confidence) };
  }
  const lowConf = row.confidence < DECISION_CONF;
  const tight = margin < DECISION_MARGIN;
  if (lowConf || tight) {
    return { kind: "decision", sortKey: 50 + margin };
  }
  return { kind: "stable", sortKey: 0 };
}

/**
 * Pick up to {@link MAX_TOKEN_MAP_HIGHLIGHTS} indices to emphasize (non-top first, then tightest decisions).
 */
export function pickEmphasizedIndices(rows: AnswerTokenRow[]): Set<number> {
  const metas = rows.map((row, i) => ({ i, ...classifyRow(row) }));
  const nontop = metas.filter((m) => m.kind === "nontop").map((m) => m.i);
  const decisions = metas
    .filter((m) => m.kind === "decision")
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((m) => m.i);

  const out = new Set<number>();
  for (const i of nontop) {
    if (out.size >= MAX_TOKEN_MAP_HIGHLIGHTS) break;
    out.add(i);
  }
  for (const i of decisions) {
    if (out.size >= MAX_TOKEN_MAP_HIGHLIGHTS) break;
    out.add(i);
  }
  return out;
}

/**
 * Per-token display classification; `emphasized` false forces stable styling even if kind was interesting.
 */
export function buildTokenMapMetas(rows: AnswerTokenRow[]): TokenMapMeta[] {
  const emphasized = pickEmphasizedIndices(rows);
  return rows.map((row, i) => {
    const { kind } = classifyRow(row);
    const em = emphasized.has(i);
    if (!em) {
      return { kind: "stable", emphasized: false };
    }
    return { kind, emphasized: true };
  });
}
