interface ExploreToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

export default function ExploreToggle({ enabled, onChange }: ExploreToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">Explore alternatives</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Hover tokens for candidates; click one to branch the completion.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-gray-900" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
