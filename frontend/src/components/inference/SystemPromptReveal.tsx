import { buildInferencePromptPreview } from "../../constants/inferencePromptTemplate";

interface SystemPromptRevealProps {
  userQuestion: string;
}

/**
 * Prompt context: short blurb by default; full template behind a disclosure.
 */
export default function SystemPromptReveal({ userQuestion }: SystemPromptRevealProps) {
  const q = userQuestion.trim();
  if (!q) return null;

  const full = buildInferencePromptPreview(q);

  return (
    <section className="space-y-2 rounded-lg border border-sky-100/90 bg-sky-50/35 px-3 py-2.5" aria-labelledby="prompt-blurb">
      <p id="prompt-blurb" className="border-l-2 border-sky-500 pl-2 text-[14px] font-semibold text-slate-800">
        Prompt used for generation.
      </p>
      <details className="group">
        <summary className="cursor-pointer list-none text-[13px] font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2 hover:decoration-sky-600 [&::-webkit-details-marker]:hidden">
          View full prompt
        </summary>
        <pre className="mt-2 max-h-[min(50vh,18rem)] overflow-auto whitespace-pre-wrap break-words rounded-md bg-white/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-800 ring-1 ring-sky-100">
          {full}
        </pre>
      </details>
      <p className="text-[13px] leading-snug text-slate-700">
        It generates the output from this prompt, one token at a time.
      </p>
    </section>
  );
}
