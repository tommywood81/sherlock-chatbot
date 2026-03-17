interface Settings {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

interface SettingsPanelProps {
  settings: Settings;
  onChange: (s: Partial<Settings>) => void;
}

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Model settings
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">temperature</label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(e) => onChange({ temperature: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">top_p</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={settings.top_p}
            onChange={(e) => onChange({ top_p: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">max_tokens</label>
          <input
            type="number"
            min={1}
            max={4096}
            value={settings.max_tokens}
            onChange={(e) => onChange({ max_tokens: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
