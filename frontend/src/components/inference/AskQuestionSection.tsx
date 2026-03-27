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
      "You’re designing a retrieval-augmented chatbot. Explain the trade-offs between chunk size, overlap, and embedding choice, and give a practical default configuration for internal docs.",
      "Summarize the difference between temperature and top_p, then recommend settings for (a) customer support and (b) creative brainstorming—with a short justification for each.",
    ],
  },
  {
    label: "Reasoning",
    questions: [
      "You have 12 coins; one is counterfeit and differs in weight (unknown heavier/lighter). With 3 weighings on a balance scale, outline a strategy to identify the counterfeit and determine if it’s heavier or lighter.",
      "A system has a 99.9% uptime SLA per month. What does that mean in minutes of allowed downtime, and what failure modes could still violate user expectations even if the SLA is met?",
    ],
  },
  {
    label: "Behavior",
    questions: [
      "Draft a short incident update (status page style) for a 30-minute outage: include what users saw, what you’re doing, and when the next update will be—calm, factual, no overpromising.",
      "Rewrite this vague request into 5 precise clarifying questions, then propose a minimal plan: “Make our chatbot better and cheaper to run.”",
    ],
  },
];

const CLASSIC_DETECTIVE_CASES: ReadonlyArray<string> = [
  // Original scenario-style puzzles (one provided by the user + two new).
  "A dead body is found in a room with an open window, a broken chair, and a balloon. The door was locked from the inside. There are no signs of a struggle. How could the killer have done it, and what does the balloon suggest?",
  "A jeweler is found unconscious in his shop. The safe is open, the alarm was never triggered, and the only oddities are a faint chemical smell and a teacup with cloudy residue. What likely happened, and how did the thief avoid the alarm?",
  "A messenger collapses in a hotel corridor. His glass of water is untouched, yet there’s a bitter-almond smell near the bedside and a damp handkerchief on the floor. The window is latched from the inside. What clues point to the method?",

  // Three scenarios inspired by Conan Doyle stories (solvable from the prompt; no need to know the canon).
  "A young woman reports her sister died suddenly at night in a locked bedroom. She heard a low whistle, then a metallic clink. In the room: a bell-pull that doesn’t ring anything, a ventilator into the next room, and a bed bolted to the floor. The neighboring room contains a metal safe, a dog-whip, and a saucer of milk. What’s the most plausible method and motive?",
  "A priceless blue gemstone vanishes from a hotel room; a worker is blamed. Days later, an old hat and a Christmas goose are recovered after a street scuffle. The gemstone is discovered inside the goose. How could the thief have used the goose as a hiding place, and what chain of custody would you investigate to identify the culprit?",
  "A famous racehorse disappears the night before a big event, and the trainer is found dead. A watchdog was on duty but did not bark during the night. There are signs of a struggle near the stable, and a stranger’s necktie is found at the scene. Why is the silent dog the key clue, and what does it imply about who approached the stable?",
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
  const [questionMode, setQuestionMode] = useState<"general" | "scenario">("scenario");
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
        className="space-y-1.5"
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
            className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <button
            type="submit"
            disabled={!canRun}
            className={`w-full rounded-lg px-4 py-2 text-[14px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto ${
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
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="whitespace-nowrap text-[14px] font-medium text-slate-800">Try an example:</p>
          <div
            className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5"
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
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
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
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
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
          <section key={group.label} className="space-y-0.5 rounded-md bg-slate-50/35 px-2 py-1">
            <h3 className="text-[13px] font-medium text-slate-800">{group.label}</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {group.questions.map((q) => {
                const isPicked = pickedExample === q;
                return (
                  <button
                    key={q}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => handleExampleClick(q)}
                    className={`w-full rounded-md border px-2 py-1 text-left text-[11px] leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
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
