export default function ModelCard() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Model card</h1>
        <p className="text-[15px] leading-relaxed text-slate-600">
          Sherlock 1B is a small instruction-tuned language model used in this demo. It is meant to illustrate
          how a compact, quantized model can adopt a clear persona while staying cheap to host on modest
          hardware.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model details</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr] sm:gap-x-4 sm:gap-y-2">
            <dt className="text-slate-500">Display name</dt>
            <dd className="text-slate-900">Sherlock 1B</dd>
            <dt className="text-slate-500">Base</dt>
            <dd className="text-slate-900">Meta Llama 3.2, 1B parameters</dd>
            <dt className="text-slate-500">Artifact</dt>
            <dd className="font-mono text-[13px] text-slate-800">llama32-1b-sherlock-v6-q4.gguf</dd>
            <dt className="text-slate-500">Quantization</dt>
            <dd className="text-slate-900">4-bit GGUF (typical profile: Q4_K_M class)</dd>
            <dt className="text-slate-500">Context</dt>
            <dd className="text-slate-900">2,048 tokens in this deployment (<code className="text-[13px]">N_CTX</code> in docker-compose / backend config)</dd>
            <dt className="text-slate-500">Runtime</dt>
            <dd className="text-slate-900">llama.cpp via llama-cpp-python in the API service</dd>
            <dt className="text-slate-500">Rough footprint</dt>
            <dd className="text-slate-900">On the order of ~2 GB RAM for weights at 4-bit; exact use depends on OS and batching</dd>
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Intended use</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          Demonstrations, prototyping, and internal experiments: short answers, light reasoning, and
          persona-style dialogue in a controlled UI. The public dashboard is a showcase, not a production
          assistant.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Out of scope</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
          <li>Medical, legal, or safety-critical decisions without human review</li>
          <li>High-stakes factual claims you cannot independently verify</li>
          <li>Long documents, tool use, or multi-agent workflows (not what this build optimizes for)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Limitations</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
          <li>At 1B scale, depth and consistency are limited; answers can be wrong, vague, or repetitive</li>
          <li>Persona and system prompts steer tone but do not guarantee factual accuracy</li>
          <li>CPU-only or small droplets add latency; quality and speed vary with load and settings</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example prompts</h2>
        <ul className="space-y-2 text-sm">
          <li className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-800">
            A locked room, an open window, and a detail that does not fit the witness story—what should we
            test first?
          </li>
          <li className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-800">
            Compare temperature and top_p for a support bot versus a creative draft, in two short paragraphs.
          </li>
          <li className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-800">
            Twelve coins, one counterfeit, unknown heavier or lighter—how do you find it in three weighings?
          </li>
        </ul>
      </section>

      <p className="text-xs text-slate-500">
        This card describes the deployment bundled with this repository. Update it when you swap weights,
        quantisation, or context limits.
      </p>
    </div>
  );
}
