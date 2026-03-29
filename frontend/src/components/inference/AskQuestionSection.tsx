import { useEffect, useRef, useState } from "react";

const STAGE_MESSAGES = [
  "Understanding prompt…",
  "Selecting best-fit tokens…",
  "Generating response…",
] as const;

const STAGE_MS = 500;

/**
 * General Queries tab only: four examples in grid order (2 columns × 2 rows; left then right per row).
 * Q4 is near-verbatim user text from `data/processed/train.jsonl` (Sherlock fine-tuning dataset).
 */
export const EXAMPLE_QUESTION_GROUPS: ReadonlyArray<{
  label: string;
  questions: readonly string[];
}> = [
  {
    label: "Knowledge",
    questions: [
      'Two suspects: Tom and Jerry. One is guilty.\n\nStatements:\n\n* Tom: "I didn\'t do it."\n* Jerry: "Tom did it."\n\nFacts:\n\n* One of them is lying\n\nQuestion:\nWho is guilty? Explain your reasoning step-by-step.',
      'Three suspects: Alice, Ben, Clara. One is guilty.\n\nStatements:\n\n* Alice: "Ben did it."\n* Ben: "Clara did it."\n* Clara: "Alice is lying."\n\nFacts:\n\n* Exactly one person is lying\n\nQuestion:\nWho is guilty? Explain your reasoning step-by-step.',
    ],
  },
  {
    label: "Reasoning",
    questions: [
      // Framed as general knowledge so the fine-tuned Holmes system block still matches training for Q4.
      "Fact question—not a case or witness statement: what is penicillin used for? Answer briefly and factually in one or two sentences.",
      'A detective claims the suspect is guilty because of this single observation: "“How in the world did you deduce that?” I asked." Is this sound reasoning?',
    ],
  },
];

/** Section titles for Scenario Challenges rows only (unchanged three-row layout). */
const SCENARIO_GROUP_LABELS = ["Knowledge", "Reasoning", "Behavior"] as const;

/** Scenario Challenges tab — six detective logic puzzles, increasing difficulty (grid order: row1 Q1–Q2, row2 Q3–Q4, row3 Q5–Q6). */
const CLASSIC_DETECTIVE_CASES: ReadonlyArray<string> = [
  'Very easy — 2 suspects, 1 liar, direct contradiction. Only Grey and Vale were in the corridor when the cameo was taken. Grey: "Vale took it." Vale: "Grey is lying." Exactly one of them always lies; the other always tells the truth. Who took the cameo?',
  'Very easy — 2 suspects, 1 false statement, simple structure. Moss: "Pike broke the seal." Pike: "What Moss says is true." Exactly one of those two sentences is false. Who broke the seal?',
  'Moderate — 3 suspects, 1 liar, slightly indirect. After a ledger vanished from the counting-house, exactly one of these three men lies; the others speak only truth. Alders: "I was not in the office that hour." Boyd: "Chiles carried the ledger out." Chiles: "Boyd\'s tale is invention." Who carried the ledger out?',
  'Moderate — 3 suspects, 1 false statement, 2-step reasoning. Drake: "Frost was last to lock the strong-room." Frost: "Gage never had a key." Gage: "Drake is wrong about Frost." Exactly one of these three statements is false. Who was last to lock the strong-room?',
  'Hard — 4 suspects, 2 liars, cross-dependencies. Four were interviewed; exactly two always lie and two always tell truth. Ince: "Jory took the files." Jory: "Kemp and Ince are both lying." Kemp: "Ince tells the truth." Loy: "Jory took the files." Who took the files?',
  'Very hard / ambiguous — 4 suspects, at least one liar, underdetermined logic. Four clerks—North, East, South, West—each deny stealing the register key. North: "South took it." South: "West is lying." West: "North and East are not both honest." East: "South speaks truth." At least one lies. Show that the four statements alone admit more than one consistent assignment of guilt unless you add an external fact. Which culprits remain possible?',
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

  const displayedGroups =
    questionMode === "scenario"
      ? [
          { label: SCENARIO_GROUP_LABELS[0], questions: CLASSIC_DETECTIVE_CASES.slice(0, 2) },
          { label: SCENARIO_GROUP_LABELS[1], questions: CLASSIC_DETECTIVE_CASES.slice(2, 4) },
          { label: SCENARIO_GROUP_LABELS[2], questions: CLASSIC_DETECTIVE_CASES.slice(4, 6) },
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
