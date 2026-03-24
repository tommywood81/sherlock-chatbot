import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const STAGE_MESSAGES = [
  "Understanding prompt…",
  "Selecting best-fit tokens…",
  "Generating response…",
] as const;

const STAGE_MS = 500;

/** Six examples in grid order: 2 columns × 3 rows (reasoning, chat, general). */
export const EXAMPLE_QUESTION_GROUPS: ReadonlyArray<{
  label: string;
  questions: readonly string[];
}> = [
  {
    label: "Knowledge",
    questions: [
      "What is the capital of Japan?",
      "Who wrote Romeo and Juliet?",
    ],
  },
  {
    label: "Reasoning",
    questions: [
      "If a train travels 60 km in 1 hour, how far does it go in 2.5 hours?",
      "A bat and a ball cost $1.10 total. The bat costs $1 more than the ball. How much does the ball cost?",
    ],
  },
  {
    label: "Behavior",
    questions: [
      "Explain what a black hole is to a 5-year-old.",
      "Write a polite email declining a meeting invitation.",
    ],
  },
];

interface AskQuestionSectionProps {
  onGenerate: (question: string) => void;
  isStreaming: boolean;
}

function useStreamingStage(isStreaming: boolean): number {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setStage(0);
      return;
    }
    setStage(0);
    const t1 = window.setTimeout(() => setStage(1), STAGE_MS);
    const t2 = window.setTimeout(() => setStage(2), STAGE_MS * 2);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isStreaming]);

  return stage;
}

/**
 * Ask a question: examples (grid) → input → generate + live-model feedback.
 */
export default function AskQuestionSection({ onGenerate, isStreaming }: AskQuestionSectionProps) {
  const [draft, setDraft] = useState("");
  const [pickedExample, setPickedExample] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingStage = useStreamingStage(isStreaming);

  const trimmed = draft.trim();
  const canRun = trimmed.length > 0 && !isStreaming;

  const handleExampleClick = (text: string) => {
    setDraft(text);
    setPickedExample(text);
    textareaRef.current?.focus();
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (pickedExample !== null && value !== pickedExample) {
      setPickedExample(null);
    }
  };

  const submit = () => {
    if (!canRun) return;
    onGenerate(trimmed);
  };

  return (
    <section
      className="mx-auto w-full max-w-[min(100%,840px)] space-y-6"
      aria-labelledby="ask-question-heading"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <div />
        <p
          id="ask-question-heading"
          className="text-center text-[16px] font-medium leading-snug text-slate-600"
        >
          Ask a question. The model will generate a response in real time
        </p>
        <div className="justify-self-end">
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-md px-2 py-1 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 [&::-webkit-details-marker]:hidden">
              System ▾
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-[250px] rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[12px] leading-snug">
                <span className="text-slate-500">Model:</span>
                <span className="font-mono text-slate-800">HF 3.2 (1B)</span>
                <span className="text-slate-500">Inference:</span>
                <span className="font-mono text-slate-800">4-bit quantised</span>
                <span className="text-slate-500">Mode:</span>
                <span className="font-mono text-slate-800">real-time generation</span>
                <span className="text-slate-500">Fine-tuning:</span>
                <span className="font-mono text-slate-800">instruction-tuned</span>
              </div>
              <div className="my-2 h-px bg-gray-200" />
              <Link
                to="/architecture"
                className="text-[12px] font-medium text-sky-700 hover:text-sky-900"
              >
                View full architecture details →
              </Link>
            </div>
          </details>
        </div>
      </div>

      {/* 1. Question categories */}
      <div className="space-y-7">
        {EXAMPLE_QUESTION_GROUPS.map((group) => (
          <section key={group.label} className="space-y-2.5 rounded-lg bg-slate-50/50 p-3">
            <h3 className="text-[16px] font-medium text-slate-800">{group.label}</h3>
            <div className="space-y-2">
              {group.questions.map((q) => {
                const isPicked = pickedExample === q;
                return (
                  <button
                    key={q}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => handleExampleClick(q)}
                    className={`w-full rounded-lg border px-3 py-3 text-left text-[14px] leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isPicked
                        ? "border-amber-400 bg-amber-50/80 text-amber-950"
                        : "border-gray-200 bg-white text-gray-800 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* 2. Input + 3. Run + feedback */}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="space-y-2">
          <label htmlFor="ask-q" className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
            Your question
          </label>
          <textarea
            ref={textareaRef}
            id="ask-q"
            rows={3}
            disabled={isStreaming}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Type a question or select an example above…"
            className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={!canRun}
            className={`w-full rounded-lg px-4 py-2.5 text-[15px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto ${
              canRun
                ? "bg-amber-900 text-amber-50 shadow-md ring-2 ring-amber-700/30 hover:bg-amber-950 focus-visible:ring-amber-600"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            Generate response
          </button>

          <p className="text-[11px] leading-snug text-slate-500">
            Each run generates a new response using the model&apos;s best-fit token predictions.
          </p>

          {isStreaming ? (
            <p
              className="min-h-[1.25rem] text-[14px] font-medium text-sky-800"
              aria-live="polite"
              aria-atomic="true"
            >
              {STAGE_MESSAGES[streamingStage]}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
