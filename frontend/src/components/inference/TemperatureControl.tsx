import type { InferenceSettings } from "../../context/InferenceExperienceContext";

interface TemperatureControlProps {
  settings: InferenceSettings;
  onChange: (s: Partial<InferenceSettings>) => void;
  disabled?: boolean;
}

const SLIDER_MAX = 1;

export default function TemperatureControl({
  settings,
  onChange,
  disabled,
}: TemperatureControlProps) {
  const t = Math.min(SLIDER_MAX, Math.max(0, settings.temperature));

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-amber-100/90 bg-amber-50/40 px-3 py-2.5 md:max-w-none">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="infer-temp" className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
          Temperature
        </label>
        <span className="font-mono text-[12px] tabular-nums font-semibold text-amber-950">{t.toFixed(2)}</span>
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
        className="w-full accent-amber-700 disabled:opacity-40"
      />
      <p className="text-[10px] leading-tight text-amber-900/75">
        <span className="font-medium text-amber-950">0.0</span> deterministic ·{" "}
        <span className="font-medium text-amber-950">0.2–0.3</span> stable ·{" "}
        <span className="font-medium text-amber-950">0.5</span> exploratory ·{" "}
        <span className="font-medium text-amber-950">0.8</span> unstable
      </p>
      <p className="text-[12px] leading-snug text-amber-950/80">Lower = stick closer to the likely next word.</p>
    </div>
  );
}
