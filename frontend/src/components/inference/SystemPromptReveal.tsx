import { buildInferencePromptPreview } from "../../constants/inferencePromptTemplate";

interface SystemPromptRevealProps {
  userQuestion: string;
  showReasoning: boolean;
}

/**
 * Prompt context: label + optional full text.
 */
export default function SystemPromptReveal({ userQuestion, showReasoning }: SystemPromptRevealProps) {
  const q = userQuestion.trim();
  if (!q) return null;

  const full = buildInferencePromptPreview(q, { showReasoning });

  return (
    <section className="space-y-2 rounded-lg border border-sky-100/90 bg-sky-50/35 px-3 py-2.5" aria-labelledby="prompt-blurb">
      <p id="prompt-blurb" className="border-l-2 border-sky-500 pl-2 text-[14px] font-semibold text-slate-800">
        Prompt
      </p>
      <details className="group">
        <summary className="cursor-pointer list-none text-[13px] font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2 hover:decoration-sky-600 [&::-webkit-details-marker]:hidden">
          View prompt
        </summary>
        <pre className="mt-2 max-h-[min(50vh,18rem)] overflow-auto whitespace-pre-wrap break-words rounded-md bg-white/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-800 ring-1 ring-sky-100">
          {full}
        </pre>
      </details>
      <p className="text-[13px] leading-snug text-slate-700">
        See the exact prompt sent to the model in the backend
      </p>
    </section>
  );
}
