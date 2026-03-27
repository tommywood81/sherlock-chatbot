/** Orange on the ends; green in the “sweet” band (same language as temperature). */
export type SamplingBand = "edge" | "sweet";

export function bandAccent(band: SamplingBand): string {
  // Muted accents to match the site's cream/slate palette.
  return band === "sweet" ? "#5f7f67" : "#8a6f49";
}

export function bandTint(band: SamplingBand): string {
  return band === "sweet" ? "rgba(95, 127, 103, 0.07)" : "rgba(138, 111, 73, 0.07)";
}
