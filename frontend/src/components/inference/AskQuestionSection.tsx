import { useEffect, useRef, useState } from "react";

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

const CLASSIC_DETECTIVE_CASES: ReadonlyArray<string> = [
  "A man is found dead in a locked room with no sign of forced entry. The window is open, and there’s a puddle of water on the floor. What happened?",
  "Wet footprints lead into a house but none lead out. Inside, a man is found dead. What does this imply?",
  "A man is found dead beside a burnt-down candle in an otherwise empty room. There are no signs of struggle. What does the candle reveal about his death?",
  "A man claims he couldn’t have committed a crime because he was on a train at the time. The detective immediately knows he’s lying. Why?",
  "A woman hears a noise in the night and immediately knows someone has died. What did she hear?",
  "A note is found at a crime scene with no fingerprints on it. Why is that suspicious?",
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
  const [questionMode, setQuestionMode] = useState<"general" | "scenario">("general");
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

  const displayedGroups = questionMode === "scenario"
    ? [
        { label: EXAMPLE_QUESTION_GROUPS[0]!.label, questions: CLASSIC_DETECTIVE_CASES.slice(0, 2) },
        { label: EXAMPLE_QUESTION_GROUPS[1]!.label, questions: CLASSIC_DETECTIVE_CASES.slice(2, 4) },
        { label: EXAMPLE_QUESTION_GROUPS[2]!.label, questions: CLASSIC_DETECTIVE_CASES.slice(4, 6) },
      ]
    : EXAMPLE_QUESTION_GROUPS;

  return (
    <section
      className="mx-auto w-full max-w-[min(100%,840px)] space-y-2"
      aria-labelledby="ask-question-heading"
    >
      <p
        id="ask-question-heading"
        className="text-center text-[14px] font-medium leading-tight text-slate-600"
      >
        Type in any question or select a question below, the model will generate a response in real time
      </p>

      {/* 1. Input + 2. Run + feedback */}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="space-y-1">
          <label htmlFor="ask-q" className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
            Your question
          </label>
          <textarea
            ref={textareaRef}
            id="ask-q"
            rows={2}
            disabled={isStreaming}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Type a question or select an example above…"
            className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
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

      {/* 3. Question categories */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="whitespace-nowrap text-[14px] font-medium text-slate-800">Try an example:</p>
          <div
            className="flex items-center rounded-lg border border-slate-200 bg-white p-1"
            role="tablist"
            aria-label="Example question mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={questionMode === "general"}
              disabled={isStreaming}
              onClick={() => {
                setQuestionMode("general");
                setPickedExample(null);
              }}
              className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                questionMode === "general"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              General Queries
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={questionMode === "scenario"}
              disabled={isStreaming}
              onClick={() => {
                setQuestionMode("scenario");
                setPickedExample(null);
              }}
              className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                questionMode === "scenario"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Scenario Challenges
            </button>
          </div>
        </div>

        {displayedGroups.map((group) => (
          <section key={group.label} className="space-y-1 rounded-md bg-slate-50/35 px-2 py-1.5">
            <h3 className="text-[14px] font-medium text-slate-800">{group.label}</h3>
            <div className="grid grid-cols-2 gap-2">
              {group.questions.map((q) => {
                const isPicked = pickedExample === q;
                return (
                  <button
                    key={q}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => handleExampleClick(q)}
                    className={`w-full rounded-md border px-2.5 py-1.5 text-left text-[12px] leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
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
    </section>
  );
}
