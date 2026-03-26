/** Orange on the ends; green in the “sweet” band (same language as temperature). */
export type SamplingBand = "edge" | "sweet";

export function bandAccent(band: SamplingBand): string {
  return band === "sweet" ? "#16a34a" : "#d97706";
}

export function bandTint(band: SamplingBand): string {
  return band === "sweet" ? "rgba(22, 163, 74, 0.06)" : "rgba(217, 119, 6, 0.06)";
}
