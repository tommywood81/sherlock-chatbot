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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Evaluation / Overview</h1>
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
          <section className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">Project Overview</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                I took a tiny 1B language model, fine-tuned it to act like Sherlock, and then shrunk it with aggressive
                4-bit quantisation to fit on my portfolio server. The result? A model that sounds like Sherlock, remembers
                what it was taught, and can chat — but reasoning is basically gone. It&apos;s tiny, efficient, and
                surprisingly flamboyant, but don&apos;t ask it to solve a puzzle.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                <span className="font-medium text-slate-800">Why this happens:</span> Under heavy quantisation, small
                models tend to retain memorised patterns and style, while losing the precision needed for multi-step
                reasoning. In other words, it keeps how to sound right, but loses the ability to think things through.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">Challenge / Experiment</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                <span className="font-medium text-slate-800">The challenge:</span> Fine-tune a 1B model for persona, then
                compress it so it fits within tight memory limits — and see what actually survives: reasoning,
                memorisation, style?
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                <span className="font-medium text-slate-800">How I tested it:</span> I ran a fixed set of prompts combining
                Sherlock-style reasoning and general knowledge, using the same system prompt as the live dashboard. The
                goal wasn&apos;t to benchmark — it was to observe what holds up, what breaks, and what that tells me about
                heavily compressed small models.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">Evaluation Takeaways</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Aggressively quantising and fine-tuning the 1B model gave a very constrained but surprisingly theatrical
                result:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>
                  <span className="font-medium text-slate-800">Memorisation survives:</span> it reliably recalls training
                  Q&amp;A when prompted in similar ways
                </li>
                <li>
                  <span className="font-medium text-slate-800">Persona survives:</span> it sounds and talks like Sherlock,
                  consistently
                </li>
                <li>
                  <span className="font-medium text-slate-800">Chatting is possible:</span> but it&apos;s a bit over-the-top
                  and repetitive, even at temperature 0.5
                </li>
                <li>
                  <span className="font-medium text-slate-800">Reasoning collapses:</span> it can&apos;t solve even simple
                  puzzles — logic beyond a single step is gone
                </li>
                <li>
                  <span className="font-medium text-slate-800">Efficiency wins:</span> tiny footprint, runs comfortably
                  within memory limits
                </li>
              </ul>

              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-slate-800">Mini examples:</p>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                  <li>
                    <span className="font-medium text-slate-800">Success:</span> Asked &quot;Who is Sherlock Holmes?&quot; it
                    produces a stylistically accurate, on-character response aligned with training
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">Failure:</span> Gave it a simple deduction puzzle — it
                    confidently produces an answer that sounds plausible but is logically incorrect
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Summary:</p>
                <p className="text-sm leading-relaxed text-slate-700">
                  You end up with a lightweight &quot;Sherlock&quot; that sounds the part and echoes what it knows, but
                  isn&apos;t much of a problem-solver. It&apos;s occasionally entertaining, occasionally surprising, but not
                  reliable for reasoning.
                </p>
              </div>
            </div>

            <div className="space-y-6 border-t border-slate-200 pt-8">
              <h2 className="text-base font-semibold text-slate-900">Evaluation / Evidence</h2>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">What holds up</h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  Structure, tone, and style survive compression well.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">Responses in training-aligned prompts:</p>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                  <li>Directionally logical</li>
                  <li>Consistent in persona</li>
                  <li>Aware of uncertainty</li>
                </ul>
                <p className="text-sm leading-relaxed text-slate-700">
                  Short dialogue and identity prompts are stable — Sherlock persona shines.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  Even when logic is shallow, it imitates deduction convincingly.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">What degrades</h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  Factual recall and general knowledge: unreliable outside training patterns.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  Generic reasoning language can sound right but often doesn&apos;t answer the question.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  Historical questions and basic facts fail most often.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">Tone holds up — but content becomes unreliable.</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">The trade-off</h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  Compression preserves pattern, style, and memorisation better than reasoning.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  Reducing precision to 4-bit in a 1B model pushes multi-step reasoning past the point of survival.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  Unquantised 1B instruct models perform slightly better on simple reasoning — quantisation amplifies the
                  drop.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">Reflection</h2>
              <p className="text-sm leading-relaxed text-slate-700">This experiment highlights a clear tradeoff between efficiency and capability:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>Fine-tuning successfully imprints persona and response structure</li>
                <li>Aggressive quantisation reduces adaptability and generalisation</li>
                <li>Memory-constrained setups can retain character-driven interaction, but not problem-solving</li>
                <li>Reasoning is significantly more sensitive to reduced precision than memorisation or style</li>
              </ul>
              <p className="text-sm leading-relaxed text-slate-700">
                In practice, slightly larger models (3B–7B) provide enough capacity for reasoning to survive, while still
                allowing quantisation for efficiency.
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
              <h2 className="text-base font-semibold text-slate-900">Bottom Line / Recommendation</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>
                  The 1B 4-bit &quot;Sherlock&quot; is narrow but not useless: it can chat, follow patterns, and maintain
                  persona
                </li>
                <li>It struggles with unfamiliar prompts, factual recall, and any multi-step logic.</li>
                <li>
                  For use cases requiring even basic reasoning, a larger model + quantisation is a better approach
                </li>
                <li>
                  Slightly increasing memory to support a larger model is likely the simplest way to significantly improve
                  overall performance
                </li>
              </ul>
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-900">Key Takeaway</p>
                <p className="text-sm leading-relaxed text-slate-700">
                  Tiny models + aggressive quantisation = a theatrical, memorable personality with almost no reasoning.
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  It&apos;s a clear example of style over substance — impressive in efficiency, but fragile in capability.
                </p>
              </div>
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
