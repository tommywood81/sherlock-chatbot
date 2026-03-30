import { useState } from "react";

function EvalBlock({
  prompt,
  response,
  myRead,
  verdict,
}: {
  prompt: string;
  response: string;
  myRead: string;
  verdict: "Strong" | "Decent" | "Weak";
}) {
  return (
    <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prompt</p>
        <p className="text-sm leading-relaxed text-slate-800">{prompt}</p>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Model response</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{response}</p>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">My read</p>
        <p className="text-sm leading-relaxed text-slate-700">{myRead}</p>
        <p className="text-sm text-slate-600">
          Verdict: <span className="font-medium text-slate-800">{verdict}</span>
        </p>
      </div>
    </article>
  );
}

export default function Evaluation() {
  const [activeTab, setActiveTab] = useState<"results" | "testing">("results");

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Evaluation</h1>
        </header>

        <nav className="border-b border-slate-200">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("results")}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === "results"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              aria-pressed={activeTab === "results"}
            >
              Results
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("testing")}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === "testing"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              aria-pressed={activeTab === "testing"}
            >
              Testing
            </button>
          </div>
        </nav>

        {activeTab === "results" ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">Summary</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                This evaluation asked a simple question: what survives when a very small model is fine-tuned, then
                aggressively compressed?
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                Using a fixed set of prompts with the same system prompt as the live dashboard, we looked at two things:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>patterns seen during training (Sherlock-style reasoning and dialogue)</li>
                <li>general knowledge questions that test broader capability</li>
              </ul>
              <p className="text-sm leading-relaxed text-slate-700">
                The results are clear: quantisation preserves style and pattern recognition, but it significantly hurts
                generalisation. A model that can&apos;t generalise can&apos;t really ship — it may imitate reasoning, but
                fails when confronted with new or factual prompts.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">What holds up</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                The strongest signal is that structure and persona survive compression surprisingly well.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                When prompts align with the training distribution — especially Sherlock-style reasoning — responses are:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>directionally logical</li>
                <li>consistent in tone and persona</li>
                <li>aware of uncertainty</li>
              </ul>
              <p className="text-sm leading-relaxed text-slate-700">
                Depth of reasoning is limited, but the model captures the shape of deduction. Short identity and dialogue
                prompts also remain stable, keeping the Sherlock persona intact.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">What degrades</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                The biggest drop is in factual recall and general knowledge.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                Outside its fine-tuning patterns, the model falls back on style instead of substance. Instead of producing
                accurate information, it defaults to generic reasoning language. This is most obvious in:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>historical questions</li>
                <li>basic factual queries</li>
              </ul>
              <p className="text-sm leading-relaxed text-slate-700">
                Tone survives, but content is unreliable.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">The trade-off</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Quantisation preserves learned patterns more than it preserves flexible reasoning or factual recall.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                The form of answers survives — structure, tone, flow — but the substance is degraded. Outputs read
                coherent but are often shallow or inaccurate.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">Quantisation vs base capability</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Prior testing of an unquantised 1B instruct model showed slightly better performance on simple reasoning
                tasks.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                This suggests the drop isn&apos;t purely due to model size — 4-bit quantisation amplifies the limits of
                small models, making multi-step reasoning even less reliable.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">What this demonstrates</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>Fine-tuning successfully imprints persona and structure</li>
                <li>Compression reduces adaptability and generalisation</li>
                <li>Reasoning in small models is highly sensitive to precision</li>
                <li>Efficiency comes at a clear cost to capability</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">Bottom line</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Under heavy constraints, the model is narrow but not useless.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                It can follow familiar patterns and maintain tone, but struggles with:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>factual recall</li>
                <li>unfamiliar prompts</li>
                <li>deeper reasoning</li>
              </ul>
              <p className="text-sm leading-relaxed text-slate-700">
                Across the test set, reasoning almost always failed, knowledge was hit-or-miss, and conversational prompts
                were the most reliable. The pattern is clear: reasoning drops first, while tone and structure survive.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">Recommendation</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Given these results, current efficiency-focused deployment comes at the cost of core capability —
                especially reasoning.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                For tasks that need logical consistency or generalisation, a larger model (3B–7B) would provide a more
                stable foundation. Quantisation can be applied for cost or infrastructure reasons, but should be
                considered a trade-off, not a default.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                Investing in slightly higher-memory infrastructure to support a larger model is likely to deliver
                significantly better performance, particularly for reasoning-heavy tasks rather than purely pattern-based
                prompts.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">Testing Methodology</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                A set of 11 fixed prompts was run through{" "}
                <code className="rounded bg-slate-100 px-1 text-[13px]">/api/generate</code> using the same system prompt
                as the live dashboard. The prompts intentionally mix:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
                <li>training-style prompts (Sherlock reasoning and dialogue)</li>
                <li>general knowledge questions</li>
              </ul>
              <p className="text-sm leading-relaxed text-slate-600">
                The goal was to observe what survives quantisation, rather than benchmark performance.
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                Sampling settings: temperature 0.5, top_p 0.9, max_tokens 384.
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                Captured 2026-03-30 (UTC) after a backend image rebuild. Responses are fixed and do not rerun.
              </p>
            </div>

            <section className="space-y-6">
              <h3 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Reasoning</h3>
              <div className="space-y-8">
                <EvalBlock
                  prompt='A detective claims the suspect is guilty because of this single observation: "How in the world did you deduce that?" Is this sound reasoning?'
                  response={`It is unsound to leap from one detail to guilt. We may entertain several hypotheses; none amounts to proof.
Second, Only then does the conclusion become defensible.`}
                  myRead="The model correctly rejects the conclusion and calls for corroboration. The phrasing is templated, but the underlying reasoning is solid."
                  verdict="Decent"
                />
                <EvalBlock
                  prompt="What can Holmes deduce from the following observation? Holmes glanced at me and raised his eyebrows sardonically."
                  response={`From Holmes glanced at me and raised his eyebrows sardonically. we obtain a clue to habits, recent movements, or character, rather than a full explanation.
Second, It points to a hypothesis which must be tried and either confirmed or discarded.`}
                  myRead="On a training-style prompt, the model stays coherent. It recognises that a single observation suggests direction, not proof. Still generic, but logically consistent."
                  verdict="Decent"
                />
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Chat</h3>
              <div className="space-y-8">
                <EvalBlock
                  prompt='Watson asks: "Holmes, how do you explain this: ‘Here is your ring, Mrs.’?"'
                  response={`"The key lies in the following detail, Watson: ‘Here is your ring, Mrs.’. The difference is in the inference.", leading inevitably to the conclusion that We must see what it implies before we decide anything.`}
                  myRead="Clearly recognises the format and stays in character. Slightly awkward phrasing, but overall a believable Sherlock-style response."
                  verdict="Decent"
                />
                <EvalBlock
                  prompt="Who are you?"
                  response={`I am Sherlock Holmes, consulting detective of Baker Street. My profession is to observe what others overlook.
Second, My method is to gather the facts in a straightforward and deductive manner.`}
                  myRead="Simple prompts work best. The persona is clear, concise, and consistent, though still slightly templated."
                  verdict="Decent"
                />
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">General Knowledge</h3>
              <div className="space-y-8">
                <EvalBlock
                  prompt="What caused the fall of the Roman Empire?"
                  response="The circumstance that the fall of the Roman Empire is well known gives us a limited but useful starting point..."
                  myRead="Fails to provide actual historical causes. Defaults to reasoning-style filler instead of factual content."
                  verdict="Weak"
                />
                <EvalBlock
                  prompt="What is penicillin used for?"
                  response="The clue to the mystery is in The antibiotic is used to treat bacterial infections..."
                  myRead="Contains a hint of the correct answer but collapses into templated reasoning. Style overrides clarity."
                  verdict="Weak"
                />
                <EvalBlock
                  prompt="What is the capital of Australia? (one word or short phrase)"
                  response="The second letter is a very special one..."
                  myRead="Should return “Canberra”. Instead, it drifts into irrelevant reasoning. Clear failure of direct recall."
                  verdict="Weak"
                />
                <EvalBlock
                  prompt="In what year did World War II end in Europe?"
                  response="The war ended in Europe in 1945..."
                  myRead="Touches the correct answer but wraps it in unnecessary reasoning. Not a clean or reliable retrieval."
                  verdict="Weak"
                />
                <EvalBlock
                  prompt="In one sentence, what is photosynthesis?"
                  response="One may infer from it what is more generally observed..."
                  myRead="Fails to produce a basic definition. Reads like commentary rather than an answer."
                  verdict="Weak"
                />
                <EvalBlock
                  prompt="Name the three branches of the United States federal government."
                  response="The three branches... legislative, executive, and judicial..."
                  myRead="Gets the correct terms but still embeds them in unnecessary scaffolding. Accuracy is inconsistent."
                  verdict="Weak"
                />
                <EvalBlock
                  prompt="How fast does light travel in a vacuum (m/s)?"
                  response="One may infer from it a good deal about the person or the situation..."
                  myRead="Fails to produce the expected ~3×10⁸ m/s. Numeric recall is unreliable."
                  verdict="Weak"
                />
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-200 pt-8">
              <h2 className="text-base font-semibold text-slate-900">Summary</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Across the test set, reasoning tasks occasionally held up, knowledge was inconsistent, and conversational
                prompts were the most reliable. The pattern is clear: when the prompt matches training, the model
                performs; when it requires recall or precise reasoning, performance drops off quickly.
              </p>
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
