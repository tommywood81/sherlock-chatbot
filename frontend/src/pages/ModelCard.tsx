export default function ModelCard() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Model Card</h1>
        <p className="text-[15px] leading-relaxed text-slate-600">
          Sherlock 1B is a small, instruction-tuned language model used in this demo. It demonstrates how a compact,
          quantised model can maintain a consistent persona while remaining inexpensive to run on modest hardware.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model Details</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-x-4 sm:gap-y-2">
            <dt className="text-slate-500">Name</dt>
            <dd className="text-slate-900">Sherlock 1B</dd>
            <dt className="text-slate-500">Base model</dt>
            <dd className="text-slate-900">Meta Llama 3.2 (1B parameters)</dd>
            <dt className="text-slate-500">Artifact</dt>
            <dd className="font-mono text-[13px] text-slate-800">llama32-1b-sherlock-v6-q4.gguf</dd>
            <dt className="text-slate-500">Quantisation</dt>
            <dd className="text-slate-900">4-bit GGUF (Q4_K_M class)</dd>
            <dt className="text-slate-500">Context length</dt>
            <dd className="text-slate-900">2,048 tokens</dd>
            <dt className="text-slate-500">Runtime</dt>
            <dd className="text-slate-900">llama.cpp via llama-cpp-python</dd>
            <dt className="text-slate-500">Approx. footprint</dt>
            <dd className="text-slate-900">~2 GB RAM (varies by system and load)</dd>
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Intended Use</h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          <p>This model is designed for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>demonstrations and prototyping</li>
            <li>short responses and lightweight reasoning</li>
            <li>persona-driven dialogue in a controlled environment</li>
          </ul>
          <p>The public dashboard is a showcase, not a production system.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Out of Scope</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
          <li>Medical, legal, or safety-critical use without human oversight</li>
          <li>High-stakes factual tasks requiring guaranteed accuracy</li>
          <li>Long-context tasks, tool use, or complex multi-step workflows</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Limitations</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
          <li>Limited reasoning depth and consistency due to model size</li>
          <li>Quantisation reduces generalisation and factual reliability</li>
          <li>Outputs may be incorrect, vague, or repetitive</li>
          <li>Performance (latency and quality) depends on hardware and configuration</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example Prompts</h2>
        <ul className="space-y-2 text-sm">
          <li className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-800">
            A locked room, an open window, and a detail that doesn&apos;t fit the witness story — what should we test
            first?
          </li>
          <li className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-800">
            Compare temperature and top_p for a support bot versus a creative draft.
          </li>
          <li className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-800">
            Twelve coins, one counterfeit — how do you find it in three weighings?
          </li>
        </ul>
      </section>
    </div>
  );
}
