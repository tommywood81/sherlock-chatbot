interface InspectGenerationToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function InspectGenerationToggle({
  enabled,
  onChange,
  disabled,
}: InspectGenerationToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:opacity-40 ${
        enabled
          ? "border-gray-900 bg-gray-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span className="text-sm font-medium text-gray-900">Inspect generation</span>
      <span
        className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-gray-900" : "bg-gray-200"
        }`}
        aria-hidden
      >
        <span
          className={`mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
