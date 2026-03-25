import { stripLeadingReasoningHeader } from "../../utils/reasoning";

const ANSWER_MARKERS = ["[ANSWER]", "[answer]", "[FINAL ANSWER]", "[final answer]"] as const;

function splitAtAnswerMarker(text: string): { before: string; after: string | null } {
  let bestIdx = -1;
  let bestLen = 0;
  for (const m of ANSWER_MARKERS) {
    const i = text.indexOf(m);
    if (i !== -1 && (bestIdx === -1 || i < bestIdx)) {
      bestIdx = i;
      bestLen = m.length;
    }
  }
  if (bestIdx === -1) return { before: text, after: null };
  return {
    before: text.slice(0, bestIdx).trimEnd(),
    after: text.slice(bestIdx + bestLen).trimStart(),
  };
}

function cleanReasoning(text: string): string {
  return stripLeadingReasoningHeader(text).trimEnd();
}

interface UnifiedOutputStreamProps {
  reasoningText: string;
  answerText: string;
  showReasoning: boolean;
  isStreaming?: boolean;
  streamText?: string;
}

const STREAM_HEADLINE = "One response, generated continuously.";

function outputNote(showReasoning: boolean): string {
  return showReasoning
    ? "The response includes a concise answer and a structured reasoning summary."
    : "The response is a direct answer only.";
}

/**
 * Single output box: reasoning (sky) and answer (emerald) in one container.
 */
export default function UnifiedOutputStream({
  reasoningText,
  answerText,
  showReasoning,
  isStreaming = false,
  streamText = "",
}: UnifiedOutputStreamProps) {
  if (isStreaming) {
    if (!streamText) {
      return (
        <section className="space-y-2" aria-labelledby="lj-step-stream">
          <h2
            id="lj-step-stream"
            className="border-l-2 border-emerald-500 pl-2 text-[14px] font-semibold leading-snug text-slate-800"
          >
            {STREAM_HEADLINE}
          </h2>
          <p className="text-[12px] leading-snug text-slate-500">{outputNote(showReasoning)}</p>
          <p className="text-[14px] text-sky-600/90">
            Generating
            <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-sky-500 align-middle" />
          </p>
        </section>
      );
    }

    const raw = streamText;
    const { before, after } = splitAtAnswerMarker(raw);
    const reasoningBlock = cleanReasoning(before);
    const answerBlock = after;

    return (
      <section className="space-y-2" aria-labelledby="lj-step-stream">
        <h2
          id="lj-step-stream"
          className="border-l-2 border-emerald-500 pl-2 text-[14px] font-semibold leading-snug text-slate-800"
        >
          {STREAM_HEADLINE}
        </h2>
        <p className="text-[12px] leading-snug text-slate-500">{outputNote(showReasoning)}</p>
        <div
          className="rounded-lg border border-gray-200/90 bg-gray-50/50 px-3 py-3 sm:px-4 sm:py-4"
          aria-label="Model output"
        >
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-900">
            {answerBlock === null ? (
              showReasoning ? (
                <div className="rounded-md bg-sky-50/95 px-2.5 py-2 ring-1 ring-sky-100/90">
                  <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                    [REASONING]
                  </p>
                  {reasoningBlock}
                  <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-sky-500 align-middle" />
                </div>
              ) : (
                <p className="text-gray-400">—</p>
              )
            ) : (
              <>
                {showReasoning ? (
                  <>
                    <p className="my-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      [ANSWER]
                    </p>
                    <div className="rounded-md bg-emerald-50/95 px-2.5 py-2 ring-1 ring-emerald-100/90">
                      {answerBlock}
                    </div>
                    <div className="mt-2 rounded-md bg-sky-50/95 px-2.5 py-2 ring-1 ring-sky-100/90">
                      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        [REASONING]
                      </p>
                      {reasoningBlock}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="my-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      [ANSWER]
                    </p>
                    <div className="rounded-md bg-emerald-50/95 px-2.5 py-2 ring-1 ring-emerald-100/90">
                      {answerBlock}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  const r = cleanReasoning(reasoningText);
  const a = answerText.trim();
  const hasAny = Boolean(r || a);

  return (
    <section className="space-y-2" aria-labelledby="lj-step-stream">
      <h2
        id="lj-step-stream"
        className="border-l-2 border-emerald-500 pl-2 text-[14px] font-semibold leading-snug text-slate-800"
      >
        {STREAM_HEADLINE}
      </h2>
      <p className="text-[12px] leading-snug text-slate-500">{outputNote(showReasoning)}</p>
      <div
        className="rounded-lg border border-gray-200/90 bg-gray-50/50 px-3 py-3 sm:px-4 sm:py-4"
        aria-label="Model output"
      >
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-900">
          {!hasAny ? (
            <p className="text-gray-400">—</p>
          ) : (
            <>
              {showReasoning ? (
                <>
                  {a ? (
                    <>
                      <p className="my-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        [ANSWER]
                      </p>
                      <div className="rounded-md bg-emerald-50/95 px-2.5 py-2 ring-1 ring-emerald-100/90">
                        {a}
                      </div>
                    </>
                  ) : null}
                  {r ? (
                    <div className="mt-2 rounded-md bg-sky-50/95 px-2.5 py-2 ring-1 ring-sky-100/90">
                      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        [REASONING]
                      </p>
                      {r}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {a ? (
                    <>
                      <p className="my-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        [ANSWER]
                      </p>
                      <div className="rounded-md bg-emerald-50/95 px-2.5 py-2 ring-1 ring-emerald-100/90">
                        {a}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md bg-emerald-50/95 px-2.5 py-2 text-gray-400 ring-1 ring-emerald-100/90">
                      —
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
