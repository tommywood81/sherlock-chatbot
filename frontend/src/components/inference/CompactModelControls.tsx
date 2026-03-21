import type { InferenceSettings } from "../../context/InferenceExperienceContext";

interface CompactModelControlsProps {
  settings: InferenceSettings;
  onChange: (s: Partial<InferenceSettings>) => void;
  disabled?: boolean;
}

export default function CompactModelControls({
  settings,
  onChange,
  disabled,
}: CompactModelControlsProps) {
  return (
    <div className="flex flex-wrap items-end gap-6 text-sm text-gray-600">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Temp</span>
        <input
          type="number"
          min={0}
          max={2}
          step={0.1}
          disabled={disabled}
          value={settings.temperature}
          onChange={(e) => onChange({ temperature: Number(e.target.value) })}
          className="w-20 rounded border border-gray-200 px-2 py-1 text-gray-900 tabular-nums disabled:opacity-40"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Max tokens</span>
        <input
          type="number"
          min={1}
          max={4096}
          disabled={disabled}
          value={settings.max_tokens}
          onChange={(e) => onChange({ max_tokens: Number(e.target.value) })}
          className="w-24 rounded border border-gray-200 px-2 py-1 text-gray-900 tabular-nums disabled:opacity-40"
        />
      </label>
    </div>
  );
}
