interface ReasoningPanelProps {
  steps: string[];
  finalAnswer: string | null;
  isStreaming?: boolean;
}

export default function ReasoningPanel({
  steps,
  finalAnswer,
  isStreaming,
}: ReasoningPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Reasoning
      </h3>
      <div className="space-y-1 font-mono text-sm text-gray-700">
        {steps.length === 0 && !finalAnswer && !isStreaming && (
          <p className="text-gray-400">
            No structured reasoning was provided (model did not emit{" "}
            <span className="font-mono">[REASONING]</span> /{" "}
            <span className="font-mono">[ANSWER]</span>).
          </p>
        )}
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-gray-400 select-none">{i + 1}.</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      {finalAnswer !== null && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-2">
            Final answer
          </h3>
          <p className="font-mono text-sm text-gray-800 whitespace-pre-wrap">{finalAnswer}</p>
        </>
      )}
      {isStreaming && steps.length === 0 && (
        <p className="text-gray-400 text-sm">Waiting for reasoning…</p>
      )}
    </div>
  );
}
