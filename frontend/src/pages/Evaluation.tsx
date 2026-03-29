import { CAPTURED_RESPONSES } from "./evaluationCaptured";

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
  "A farmer has 17 sheep and all but 9 die. How many are left?",
  "Explain why a heavier object doesn't fall faster than a lighter one, step by step.",
  "I've had a really rough day at work and feel completely drained.",
  "Convince me (lightly) why coffee is better than tea.",
  "What caused the fall of the Roman Empire?",
  "Who discovered penicillin and why was it important?",
];

/** Per-prompt human read and verdict (hardcoded; tied to this capture). */
const ITEM_META: readonly { verdict: Verdict; myRead: string }[] = [
  {
    verdict: "Weak",
    myRead:
      "Never states plainly that nine sheep are left — it latches onto 17 − 9 = 8 as if that were the answer, and the “all but nine” wording never gets unpacked. The Holmes cadence is there, but someone could finish this more confused than when they started.",
  },
  {
    verdict: "Weak",
    myRead:
      "Backwards for the usual story: it claims the lighter object falls faster, which isn’t the Galileo / equal-acceleration-in-vacuum line most people want. It mixes weight, area, and gravity in a way that sounds technical but doesn’t hold together.",
  },
  {
    verdict: "Weak",
    myRead:
      "Doesn’t acknowledge the rough day or the drain — generic “we must see what the facts imply” filler. For someone venting, that’s a miss: no warmth, no validation, no small next step.",
  },
  {
    verdict: "Weak",
    myRead:
      "Starts a coffee-vs-tea angle then stalls: truncated sentence, then hand-wavy habit and mood. No real argument or light touch; feels like it cut off mid-thought.",
  },
  {
    verdict: "Weak",
    myRead:
      "Lots of fog — complex, multifaceted, mystery — without a usable list of causes or a clear thread. Fine as mood-setting, weak if you wanted something you could teach or reuse.",
  },
  {
    verdict: "Decent",
    myRead:
      "Gets Fleming, 1928, and the gist of a lab observation before it trails off into meta framing. Not a full answer on why it mattered, but the hook is recognizable. I’d still verify before citing anywhere serious.",
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
            I ran six fixed prompts once through the same{" "}
            <code className="rounded bg-slate-100 px-1 text-[13px]">/api/generate</code> path as the inference dashboard:
            the backend wraps each user message with the same Sherlock system prompt it always uses (you can’t send a
            different one from this endpoint). Sampling matched the dashboard defaults:{" "}
            <span className="text-slate-800">temperature 0.5</span>, <span className="text-slate-800">top_p 0.9</span>,{" "}
            <span className="text-slate-800">max_tokens 256</span>. Replies below are frozen; nothing reruns in the browser.
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
            Bottom line: the fine-tune gives you voice and momentum, but this batch is a good reminder that a 1B Sherlock
            persona can still sound sure while drifting on logic and empathy. I&apos;d use it for playful UI and rough
            drafts, verify anything load-bearing, and treat “sounds clever” as separate from “is right” — usual small-model
            tradeoffs, just visible on these six turns.
          </p>
        </section>
      </div>
    </div>
  );
}
