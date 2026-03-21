/**
 * Standardized shape for the guided “best-fit” inference demo.
 */

export interface AlternativeBranchData {
  /** 1-based path number for display */
  pathNumber: number;
  originalToken: string;
  originalProb: number;
  altToken: string;
  altProb: number;
  /** Parsed final answer for this branch */
  result: string;
}

export interface DemoGenerationResult {
  prompt: string;
  answer: string;
  reasoningSteps: string[];
  /** Short strings to emphasize in the hero answer (decision tokens) */
  highlightTokens: string[];
  alternatives: AlternativeBranchData[];
  /** Global token index of the divergence step, if any */
  divergenceTokenIndex: number | null;
  metrics: {
    latencyMs: number;
    avgConfidencePct: number;
    decisionSensitivityPct: number;
  };
}
