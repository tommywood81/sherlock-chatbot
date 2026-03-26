interface UnifiedOutputStreamProps {
  isStreaming?: boolean;
  streamText?: string;
  /** Full response after streaming completes */
  responseText: string;
}

const STREAM_HEADLINE = "Sherlock’s reply";

/**
 * Single narrative output: observation → deduction → conclusion in one stream (no parsing).
 */
export default function UnifiedOutputStream({
  isStreaming = false,
  streamText = "",
  responseText,
}: UnifiedOutputStreamProps) {
  const live = streamText.trim();
  const done = responseText.trim();
  const display = isStreaming ? live : done;

  return (
    <section className="space-y-2" aria-labelledby="lj-step-stream">
      <h2
        id="lj-step-stream"
        className="border-l-2 border-emerald-600 pl-2 text-[14px] font-semibold leading-snug text-slate-800"
      >
        {STREAM_HEADLINE}
      </h2>
      <p className="text-[12px] leading-snug text-slate-500">
        One continuous response: observations, deduction, and a clear conclusion—no separate panels.
      </p>
      <div
        className="rounded-lg border border-[#e8dcc8] bg-[#fffdf8] px-3 py-3 sm:px-4 sm:py-4"
        aria-label="Model output"
      >
        {isStreaming && !live ? (
          <p className="text-[14px] text-sky-700/90">
            Generating
            <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-sky-600 align-middle" />
          </p>
        ) : display ? (
          <div className="whitespace-pre-wrap text-[15px] leading-[1.75] text-slate-900">{display}</div>
        ) : (
          <p className="text-slate-400">—</p>
        )}
      </div>
    </section>
  );
}
