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
  isStreaming?: boolean;
  streamText?: string;
}

const STREAM_HEADLINE =
  "Reasoning and answer are produced in one generation stream.";

/**
 * Model output only inside the tinted block; all explanations are outside it.
 */
export default function UnifiedOutputStream({
  reasoningText,
  answerText,
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
        <div
          className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap"
          aria-label="Model output"
        >
          {answerBlock === null ? (
            <span className="rounded-md bg-sky-50/90 px-1 py-0.5 ring-1 ring-sky-100/80">
              {reasoningBlock}
              <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-sky-500 align-middle" />
            </span>
          ) : (
            <>
              <span className="rounded-md bg-sky-50/90 px-1 py-0.5 align-baseline ring-1 ring-sky-100/80">
                {reasoningBlock}
              </span>
              <span className="mx-1 inline select-none align-baseline text-[11px] font-semibold text-emerald-700">
                [ANSWER]
              </span>
              <span className="rounded-md bg-emerald-50/90 px-1 py-0.5 align-baseline ring-1 ring-emerald-100/80">
                {answerBlock}
              </span>
            </>
          )}
        </div>
      </section>
    );
  }

  const r = cleanReasoning(reasoningText);
  const a = answerText.trim();

  return (
    <section className="space-y-2" aria-labelledby="lj-step-stream">
      <h2
        id="lj-step-stream"
        className="border-l-2 border-emerald-500 pl-2 text-[14px] font-semibold leading-snug text-slate-800"
      >
        {STREAM_HEADLINE}
      </h2>
      <div
        className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap"
        aria-label="Model output"
      >
        {r ? (
          <span className="rounded-md bg-sky-50/90 px-1 py-0.5 align-baseline ring-1 ring-sky-100/80">{r}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
        <span className="mx-1 inline select-none align-baseline text-[11px] font-semibold text-emerald-700">
          [ANSWER]
        </span>
        {a ? (
          <span className="rounded-md bg-emerald-50/90 px-1 py-0.5 align-baseline ring-1 ring-emerald-100/80">{a}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>
    </section>
  );
}
