import {
  CAPTURED_RESPONSES,
  CAPTURED_SAMPLING,
  EVALUATION_CAPTURED_AT_ISO,
} from "./evaluationCaptured";

type Verdict = "Strong" | "Decent" | "Weak";

type EvalItem = {
  prompt: string;
  response: string;
  verdict: Verdict;
  myRead: string;
};

type CategoryBlock = {
  id: string;
  title: string;
  items: EvalItem[];
};

/** Order must match `PROMPTS` in `scripts/capture-evaluation.mjs` and `CAPTURED_RESPONSES` indices. */
const FLAT_PROMPTS: readonly string[] = [
  'A detective claims the suspect is guilty because of this single observation: "“How in the world did you deduce that?” I asked." Is this sound reasoning?',
  "What can Holmes deduce from the following observation? Holmes glanced at me and raised his eyebrows sardonically.",
  'Watson asks: "Holmes, how do you explain this: “Here is your ring, Mrs.”"',
  "Who are you?",
  "What caused the fall of the Roman Empire?",
  "What is penicillin used for?",
];

/** Per-prompt human read and verdict (hardcoded; tied to this capture). */
const ITEM_META: readonly { verdict: Verdict; myRead: string }[] = [
  {
    verdict: "Decent",
    myRead:
      "This is the strongest behavior in the set: it rejects guilt from a single observation and calls for corroboration. Wording is still templated, but the core reasoning is correct and useful.",
  },
  {
    verdict: "Decent",
    myRead:
      "On an exact training-style deduction prompt, the model stays coherent: one clue can guide next steps but is not proof alone. Generic phrasing persists, yet the logic is serviceable.",
  },
  {
    verdict: "Decent",
    myRead:
      "The Watson-format training pattern is recognizable and in-character. It is formulaic and slightly awkward around quotation marks, but still lands as a plausible Sherlock-style response.",
  },
  {
    verdict: "Decent",
    myRead:
      "Short identity prompt performs better than open-ended chat: clear persona, concise self-description, and stable tone. It still contains the recurring templated “Second,” line.",
  },
  {
    verdict: "Weak",
    myRead:
      "General-knowledge recall remains shaky in this run. The answer uses detective scaffolding instead of concrete historical factors, so it reads stylistically on-brand but not factually informative.",
  },
  {
    verdict: "Weak",
    myRead:
      "Penicillin should trigger a direct factual answer (antibiotic for bacterial infections), but this output collapses into generic case-analysis language. Useful signal that quantized behavior still overfits style over facts.",
  },
];

const CATEGORY_LAYOUT: { id: string; title: string; itemIndices: readonly [number, number] }[] = [
  { id: "reasoning", title: "Reasoning", itemIndices: [0, 1] },
  { id: "chat", title: "Chat", itemIndices: [2, 3] },
  { id: "gk", title: "General Knowledge", itemIndices: [4, 5] },
];

function buildCategories(): CategoryBlock[] {
  const expected = FLAT_PROMPTS.length;
  if (CAPTURED_RESPONSES.length !== expected || ITEM_META.length !== expected) {
    throw new Error(
      `evaluationCaptured.ts has ${CAPTURED_RESPONSES.length} responses; expected ${expected}. Re-run scripts/capture-evaluation.mjs.`
    );
  }
  return CATEGORY_LAYOUT.map((cat) => ({
    id: cat.id,
    title: cat.title,
    items: cat.itemIndices.map((i) => ({
      prompt: FLAT_PROMPTS[i]!,
      response: CAPTURED_RESPONSES[i] ?? "",
      verdict: ITEM_META[i]!.verdict,
      myRead: ITEM_META[i]!.myRead,
    })),
  }));
}

const CATEGORIES = buildCategories();

export default function Evaluation() {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Evaluation</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            I ran six fixed prompts through{" "}
            <code className="rounded bg-slate-100 px-1 text-[13px]">/api/generate</code> using the same training-style
            system prompt as the inference dashboard. This set intentionally mixes exact training-pattern prompts with
            general-knowledge checks to measure what survives quantization. Capture sampling:{" "}
            <span className="text-slate-800">temperature {CAPTURED_SAMPLING.temperature}</span>,{" "}
            <span className="text-slate-800">top_p {CAPTURED_SAMPLING.top_p}</span>,{" "}
            <span className="text-slate-800">max_tokens {CAPTURED_SAMPLING.max_tokens}</span>. Captured{" "}
            <time dateTime={EVALUATION_CAPTURED_AT_ISO} className="text-slate-800">
              {EVALUATION_CAPTURED_AT_ISO.slice(0, 10)}
            </time>{" "}
            (UTC) after a backend image rebuild. Replies are frozen; nothing reruns in the browser.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Each block below is: the question, the model&apos;s answer verbatim, then what I make of that pair.
          </p>
        </header>

        {CATEGORIES.map((cat) => (
          <section key={cat.id} className="space-y-6">
            <h2 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">{cat.title}</h2>

            <div className="space-y-8">
              {cat.items.map((item) => (
                <article
                  key={item.prompt}
                  className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prompt</p>
                    <p className="text-sm leading-relaxed text-slate-800">{item.prompt}</p>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Model response</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.response}</p>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">My read</p>
                    <p className="text-sm leading-relaxed text-slate-700">{item.myRead}</p>
                    <p className="text-sm text-slate-600">
                      Verdict: <span className="font-medium text-slate-800">{item.verdict}</span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="border-t border-slate-200 pt-8">
          <p className="text-sm leading-relaxed text-slate-700">
            Bottom line: exact training-pattern prompts now produce more usable (Decent) responses, while general-knowledge
            prompts remain the weak spot. This supports the current thesis: compression preserves learned response style
            better than robust factual recall.
          </p>
        </section>
      </div>
    </div>
  );
}
