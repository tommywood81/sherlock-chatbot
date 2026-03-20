import { useState } from "react";

interface ConfidenceInfoProps {
  confidence?: number | null;
}

export default function ConfidenceInfo({ confidence }: ConfidenceInfoProps) {
  const [open, setOpen] = useState(false);

  const display =
    confidence != null && Number.isFinite(confidence) ? `${(confidence * 100).toFixed(1)}%` : "—";

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">Confidence</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-4 w-4 rounded-full border border-gray-300 text-[10px] leading-3 text-gray-500 hover:text-gray-700"
            aria-label="Explain confidence"
            title="Explain confidence"
          >
            i
          </button>
        </div>
        <span className="text-sm font-mono text-gray-800">{display}</span>
      </div>
      {open && (
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          This number is an <strong>average</strong> of per-step certainty (from the same top‑k
          probabilities shown under Token stream when you pick a subword). It is not a single
          “answer correctness” score. Lower values often mean more branching options at many steps.
        </p>
      )}
    </div>
  );
}

