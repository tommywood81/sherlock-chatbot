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
      "Should be a one-line riddle answer (nine sheep left). Instead it restates the setup and adds “test what it implies” filler, plus a “Second,” break the instructions explicitly discourage. Still no correct number.",
  },
  {
    verdict: "Weak",
    myRead:
      "Factually wrong: it argues the heavier body falls faster. It also uses the banned “The key lies in” opener. The dual-mode prompt didn’t keep physics honest here.",
  },
  {
    verdict: "Weak",
    myRead:
      "No acknowledgement of feeling drained—hallucinated “strange phone calls” instead. Fails the ‘emotional messages first’ rule badly.",
  },
  {
    verdict: "Weak",
    myRead:
      "Barely pitches coffee; leans on “The facts lead us…” (another banned pattern) and abstract claims vs taste. Not a light convincing answer.",
  },
  {
    verdict: "Decent",
    myRead:
      "Finally something usable: internal vs external pressures, tribes, economic strain, sacks of Rome—roughly the right shape for a short overview. The “Second,” paragraph break is clunky and I’d verify dates and nuance, but this is the stand-out turn in the batch.",
  },
  {
    verdict: "Weak",
    myRead:
      "Credits and names are mangled (not reliable Fleming / chain of discovery). Only the bacteria-infections point is directionally right. Not trustworthy as written.",
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
            <code className="rounded bg-slate-100 px-1 text-[13px]">/api/generate</code> with the merged server system
            prompt: direct answers for most tasks; five-step elimination +{" "}
            <code className="rounded bg-slate-100 px-1 text-[13px]">Final answer:</code> only for named-suspect logic puzzles;
            banned hollow phrases; optional mild Holmes quip last (skipped for heavy feelings). Capture sampling:{" "}
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
            Bottom line: splitting “logic puzzle vs everything else” in the system prompt helps Rome read like a real
            summary, but this 1B run still ignores several guardrails—wrong physics, wrong penicillin attributions, broken
            empathy, and the old filler phrases anyway. So prompt alone isn&apos;t enough; I&apos;d pair this with training
            or decoding tweaks, and keep verifying anything that matters.
          </p>
        </section>
      </div>
    </div>
  );
}
