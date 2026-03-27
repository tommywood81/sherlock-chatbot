import type { CSSProperties } from "react";
import type { InferenceSettings } from "../../context/InferenceExperienceContext";
import { bandAccent, bandTint, type SamplingBand } from "./samplingBandStyles";

interface TemperatureControlProps {
  settings: InferenceSettings;
  onChange: (s: Partial<InferenceSettings>) => void;
  disabled?: boolean;
}

const SLIDER_MAX = 1;

function getTempBand(temp: number): SamplingBand {
  if (temp >= 0.4 && temp <= 0.7) return "sweet";
  return "edge";
}

export default function TemperatureControl({
  settings,
  onChange,
  disabled,
}: TemperatureControlProps) {
  const t = Math.min(SLIDER_MAX, Math.max(0, settings.temperature));
  const band = getTempBand(t);
  const accent = bandAccent(band);
  const pct = Math.round((t / SLIDER_MAX) * 100);

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
          htmlFor="infer-temp"
          className="text-[10px] font-bold uppercase tracking-wider text-slate-700"
        >
          Temperature
        </label>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-800">
          {t.toFixed(2)}
        </span>
      </div>

      <input
        id="infer-temp"
        type="range"
        min={0}
        max={SLIDER_MAX}
        step={0.05}
        disabled={disabled}
        value={t}
        onChange={(e) => onChange({ temperature: Number(e.target.value) })}
        className="range-temp disabled:opacity-40"
        style={cssVars}
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] leading-snug text-slate-600">
        <span className={band === "edge" ? "font-semibold text-slate-900" : ""}>
          0.0–0.4 low (orange)
        </span>
        <span className={band === "sweet" ? "font-semibold text-slate-900" : ""}>
          0.4–0.7 sweet spot (green)
        </span>
        <span className={band === "edge" ? "font-semibold text-slate-900" : ""}>
          0.7–1.0 high (orange)
        </span>
      </div>

      <p className="text-[11px] leading-snug text-slate-600">
        How random the next token is: low is steadier, high is more varied. This model tends to read best around 0.4–0.7—enough flair without wandering.
      </p>
    </div>
  );
}
