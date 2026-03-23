/**
 * Subtle confidence tiers for word-choice inspection (no heavy heatmaps).
 */

export type ConfidenceTier = "high" | "medium" | "low" | "unknown";

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (!Number.isFinite(confidence)) return "unknown";
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.45) return "medium";
  return "low";
}

export function tierToClassName(tier: ConfidenceTier, inspectActive: boolean): string {
  if (!inspectActive) return "border-b border-transparent";
  switch (tier) {
    case "high":
      return "border-b border-transparent hover:border-neutral-300/50 transition-colors duration-150";
    case "medium":
      return "border-b border-neutral-400/35 hover:border-neutral-500/50 transition-colors duration-150";
    case "low":
      return "border-b border-amber-700/25 hover:border-amber-700/45 transition-colors duration-150";
    default:
      return "border-b border-neutral-300/30";
  }
}
