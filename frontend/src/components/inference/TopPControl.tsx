import type { CSSProperties } from "react";
import type { InferenceSettings } from "../../context/InferenceExperienceContext";
import { bandAccent, bandTint, type SamplingBand } from "./samplingBandStyles";

interface TopPControlProps {
  settings: InferenceSettings;
  onChange: (s: Partial<InferenceSettings>) => void;
  disabled?: boolean;
}

/** Sweet when nucleus isn’t too tight or too loose (good default ~0.9). */
function getTopPBand(p: number): SamplingBand {
  if (p >= 0.7 && p <= 0.95) return "sweet";
  return "edge";
}

export default function TopPControl({ settings, onChange, disabled }: TopPControlProps) {
  const p = Math.min(1, Math.max(0, settings.top_p));
  const band = getTopPBand(p);
  const accent = bandAccent(band);
  const pct = Math.round(p * 100);

  const cssVars = {
    ["--temp-accent" as string]: accent,
    ["--temp-pct" as string]: `${pct}%`,
  } as CSSProperties;

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-lg border bg-white px-3 py-2.5 md:max-w-none"
      style={{
        borderColor: accent,
        background: bandTint(band),
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor="infer-top-p"
          className="text-[11px] font-bold uppercase tracking-wider text-slate-700"
        >
          Top P
        </label>
        <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-800">
          {p.toFixed(2)}
        </span>
      </div>

      <input
        id="infer-top-p"
        type="range"
        min={0}
        max={1}
        step={0.05}
        disabled={disabled}
        value={p}
        onChange={(e) => onChange({ top_p: Number(e.target.value) })}
        className="range-temp disabled:opacity-40"
        style={cssVars}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-snug text-slate-600">
        <span className={band === "edge" ? "font-semibold text-slate-900" : ""}>
          0.0–0.7 tight (orange)
        </span>
        <span className={band === "sweet" ? "font-semibold text-slate-900" : ""}>
          0.7–0.95 balanced (green)
        </span>
        <span className={band === "edge" ? "font-semibold text-slate-900" : ""}>
          0.95–1.0 loose (orange)
        </span>
      </div>

      <p className="text-[12px] leading-snug text-slate-600">
        Nucleus sampling: only the most likely tokens up to this probability mass are considered. Lower values keep the model closer to the safest choices; higher values allow rarer words through.
      </p>
    </div>
  );
}
