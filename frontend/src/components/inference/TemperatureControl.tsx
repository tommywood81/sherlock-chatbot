import type { CSSProperties } from "react";
import type { InferenceSettings } from "../../context/InferenceExperienceContext";

interface TemperatureControlProps {
  settings: InferenceSettings;
  onChange: (s: Partial<InferenceSettings>) => void;
  disabled?: boolean;
}

const SLIDER_MAX = 1;

/** Blue 0–0.3 stable, amber 0.3–0.6 exploratory, red 0.6–1.0 unstable */
type TempBand = "stable" | "exploratory" | "unstable";

function getTempBand(temp: number): TempBand {
  if (temp <= 0.3) return "stable";
  if (temp <= 0.6) return "exploratory";
  return "unstable";
}

function bandAccent(band: TempBand): string {
  if (band === "stable") return "#2563eb";
  if (band === "exploratory") return "#d97706";
  return "#dc2626";
}

function bandTint(band: TempBand): string {
  if (band === "stable") return "rgba(37, 99, 235, 0.06)";
  if (band === "exploratory") return "rgba(217, 119, 6, 0.06)";
  return "rgba(220, 38, 38, 0.06)";
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
      className="flex w-full flex-col gap-2 rounded-lg border bg-white px-3 py-2.5 md:max-w-none"
      style={{
        borderColor: accent,
        background: bandTint(band),
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor="infer-temp"
          className="text-[11px] font-bold uppercase tracking-wider text-slate-700"
        >
          Temperature
        </label>
        <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-800">
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

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-snug text-slate-600">
        <span className={band === "stable" ? "font-semibold text-slate-900" : ""}>
          0.0–0.3 stable
        </span>
        <span className={band === "exploratory" ? "font-semibold text-slate-900" : ""}>
          0.3–0.6 exploratory
        </span>
        <span className={band === "unstable" ? "font-semibold text-slate-900" : ""}>
          0.6–1.0 unstable
        </span>
      </div>

      <p className="text-[12px] leading-snug text-slate-600">
        Lower sticks to the obvious path; higher explores more.
      </p>
    </div>
  );
}
