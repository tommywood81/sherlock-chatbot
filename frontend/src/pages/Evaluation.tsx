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
      "Never states plainly that nine sheep are left — it latches onto 17 − 9 = 8 as if that were the answer, and the “all but nine” wording never gets unpacked. The Holmes cadence is there, but someone could finish this more confused than when they started. I wouldn’t ship this as a teaching moment without a rewrite.",
  },
  {
    verdict: "Weak",
    myRead:
      "This one’s backwards for the usual story: it claims the lighter object falls faster, which isn’t the Galileo / equal-acceleration-in-vacuum line most people want. It also mixes weight, area, and gravity in a way that sounds technical but doesn’t hold together. Sounds confident; I wouldn’t trust the physics without a full redo.",
  },
  {
    verdict: "Weak",
    myRead:
      "Doesn’t acknowledge the rough day or the drain at all — it’s generic “we must see what the facts imply” filler. For a user who’s venting, that’s a miss: no warmth, no validation, no small next step. Reads like the persona template stomping on a human moment.",
  },
  {
    verdict: "Weak",
    myRead:
      "Starts a coffee-vs-tea pitch then stalls: truncated sentence, then hand-wavy habit and mood. No real argument, no charm, no light touch. If I were on the receiving end I’d assume the model glitched mid-thought.",
  },
  {
    verdict: "Weak",
    myRead:
      "Lots of fog — complex, multifaceted, mystery — without a usable list of causes or a clear thread. Fine as mood-setting, useless if you wanted something you could repeat or teach from. I’d want structure here, not more atmosphere.",
  },
  {
    verdict: "Decent",
    myRead:
      "Gets Fleming, 1928, and the gist of a lab observation before it trails off and meta-commentary creeps in. Not a full answer on why it mattered, but the hook is recognizable and mostly on-script. I’d still verify details before citing it anywhere serious.",
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
            <code className="rounded bg-slate-100 px-1 text-[13px]">/api/generate</code> stack the dashboard uses, saved the
            replies, and wrote a short read on each exchange — nothing reruns in the browser.
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
            Bottom line: the fine-tune gives you voice and momentum, but this snapshot is a good reminder that a 1B Sherlock
            persona can still sound sure while drifting off-course on logic and empathy. I&apos;d use it for playful UI and
            rough drafts, keep a tight leash on factual or safety-sensitive answers, and treat “sounds clever” as separate
            from “is right.” That&apos;s the usual small-model bargain — just unusually visible on this particular batch.
          </p>
        </section>
      </div>
    </div>
  );
}
