import { useState } from "react";

interface ExplanationHintProps {
  className?: string;
}

export default function ExplanationHint({ className = "" }: ExplanationHintProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={`rounded-md border border-gray-200 bg-gray-50 px-3 py-2 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-gray-600 leading-relaxed">
          This model generates text one token at a time. At each step, it picks the most likely
          next token based on what came before. Click any word to see alternative tokens the model
          considered.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss helper text"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

