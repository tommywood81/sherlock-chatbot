import type { CSSProperties } from "react";
import type { InferenceSettings } from "../../context/InferenceExperienceContext";
import { bandAccent, bandTint, type SamplingBand } from "./samplingBandStyles";

interface MaxTokensControlProps {
  settings: InferenceSettings;
  onChange: (s: Partial<InferenceSettings>) => void;
  disabled?: boolean;
}

const MIN = 32;
const MAX = 512;
const STEP = 32;

function snapMaxTokens(n: number): number {
  const snapped = Math.round((n - MIN) / STEP) * STEP + MIN;
  return Math.min(MAX, Math.max(MIN, snapped));
}

/** Sweet for typical Sherlock-length answers; edges are very short or very long. */
function getMaxTokensBand(v: number): SamplingBand {
  if (v >= 128 && v <= 384) return "sweet";
  return "edge";
}

export default function MaxTokensControl({ settings, onChange, disabled }: MaxTokensControlProps) {
  const v = snapMaxTokens(settings.max_tokens);
  const band = getMaxTokensBand(v);
  const accent = bandAccent(band);
  const pct = Math.round(((v - MIN) / (MAX - MIN)) * 100);

  const cssVars = {
    ["--temp-accent" as string]: accent,
    ["--temp-pct" as string]: `${pct}%`,
  } as CSSProperties;

  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-lg border bg-white px-3 py-2 md:max-w-none"
      style={{
        borderColor: accent,
        background: bandTint(band),
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor="infer-max-tokens"
          className="text-[10px] font-bold uppercase tracking-wider text-slate-700"
        >
          Max tokens
        </label>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-800">{v}</span>
      </div>

      <input
        id="infer-max-tokens"
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        disabled={disabled}
        value={v}
        onChange={(e) => onChange({ max_tokens: Number(e.target.value) })}
        className="range-temp disabled:opacity-40"
        style={cssVars}
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] leading-snug text-slate-600">
        <span className={band === "edge" ? "font-semibold text-slate-900" : ""}>
          32–128 brief (orange)
        </span>
        <span className={band === "sweet" ? "font-semibold text-slate-900" : ""}>
          128–384 comfortable (green)
        </span>
        <span className={band === "edge" ? "font-semibold text-slate-900" : ""}>
          384–512 long (orange)
        </span>
      </div>

      <p className="text-[11px] leading-snug text-slate-600">
        Hard cap on how many tokens the model may generate. Too low cuts off mid-thought; very high allows longer answers at the cost of time and focus.
      </p>
    </div>
  );
}
