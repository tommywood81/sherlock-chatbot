interface ReasoningCollapsibleProps {
  steps: string[];
  isStreaming?: boolean;
}

/** Collapsed-by-default reasoning trace. */
export default function ReasoningCollapsible({ steps, isStreaming }: ReasoningCollapsibleProps) {
  return (
    <details className="group rounded-lg border border-gray-100 bg-white open:shadow-sm transition-shadow">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center justify-between gap-2">
        <span>Model reasoning</span>
        <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-4 pt-0 border-t border-gray-50">
        {steps.length === 0 && !isStreaming && (
          <p className="text-sm text-gray-400 mt-3">No structured reasoning block in this reply.</p>
        )}
        {steps.length > 0 && (
          <ol className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed list-decimal list-inside">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
        {isStreaming && steps.length === 0 && (
          <p className="text-sm text-gray-400 mt-3">Thinking…</p>
        )}
      </div>
    </details>
  );
}
