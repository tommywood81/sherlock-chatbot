interface PromptSectionProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

const GROUP_LABEL_CLASS: Record<string, string> = {
  Reasoning: "text-amber-800",
  Chat: "text-violet-700",
  "General knowledge": "text-emerald-800",
};

/** Six example questions in three groups (labels for visual grouping only). */
export const EXAMPLE_QUESTION_GROUPS: ReadonlyArray<{
  label: string;
  questions: readonly string[];
}> = [
  {
    label: "Reasoning",
    questions: [
      "Why did the dog not bark in the night?",
      "What can be inferred from a missing clue?",
    ],
  },
  {
    label: "Chat",
    questions: ["Explain this like Sherlock Holmes", "Walk me through your thinking"],
  },
  {
    label: "General knowledge",
    questions: ["Why is the sky blue?", "What causes inflation?"],
  },
];

export default function PromptSection({ onSubmit, disabled }: PromptSectionProps) {
  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const raw = String(fd.get("q") ?? "").trim();
          if (!raw || disabled) return;
          onSubmit(raw);
        }}
      >
        <label
          htmlFor="inference-q"
          className="text-[11px] font-bold uppercase tracking-wider text-sky-800"
        >
          Your question
        </label>
        <textarea
          id="inference-q"
          name="q"
          rows={2}
          disabled={disabled}
          placeholder="Ask Sherlock a question…"
          className="w-full resize-y border-0 border-b-2 border-sky-200/80 bg-sky-50/30 px-0 py-1.5 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-sky-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="self-start rounded-md bg-amber-900 px-3.5 py-1.5 text-[14px] font-semibold text-amber-50 hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run
        </button>
      </form>

      <div className="space-y-3 border-t border-gray-100 pt-3">
        {EXAMPLE_QUESTION_GROUPS.map((g) => (
          <div key={g.label} className="space-y-1.5">
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${GROUP_LABEL_CLASS[g.label] ?? "text-gray-600"}`}
            >
              {g.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {g.questions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSubmit(s)}
                  className="rounded-full border border-gray-200/90 bg-white px-2.5 py-1 text-left text-[12px] leading-snug text-gray-700 hover:border-sky-300 hover:bg-sky-50/60 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
