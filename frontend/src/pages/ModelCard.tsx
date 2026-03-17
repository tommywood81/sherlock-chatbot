export default function ModelCard() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Model Card</h1>
        <p className="text-gray-500 text-sm mt-1">
          Sherlock Tiny LM — 1B parameter model for Sherlock Holmes–style reasoning.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Overview
        </h2>
        <dl className="space-y-2 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Model</dt>
            <dd className="text-gray-900">Sherlock-1B</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Base model</dt>
            <dd className="text-gray-900">HF 3.2-1B</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Fine-tuning</dt>
            <dd className="text-gray-900">Sherlock Holmes reasoning corpus</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Quantization</dt>
            <dd className="text-gray-900">GGUF Q4_K_M</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">RAM usage</dt>
            <dd className="text-gray-900">~1.8 GB</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Context length</dt>
            <dd className="text-gray-900">4096</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Inference engine</dt>
            <dd className="text-gray-900">llama.cpp</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Capabilities
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
          <li>Short deductive reasoning in the style of Sherlock Holmes</li>
          <li>Structured output with [REASONING] and [ANSWER] sections</li>
          <li>Runs on CPU with quantized weights (Q4_K_M)</li>
          <li>Low latency for small-batch inference</li>
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Limitations
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
          <li>1B parameters — limited long-form or multi-step reasoning</li>
          <li>May hallucinate or repeat; tune temperature and top_p</li>
          <li>Best for short Q&A and single-step deduction</li>
          <li>Not suitable for factual or safety-critical applications without verification</li>
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Example prompts
        </h2>
        <ul className="space-y-2 text-sm">
          <li className="rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-gray-800">
            Why did the dog not bark in the night?
          </li>
          <li className="rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-gray-800">
            What can you deduce from a man with clay on his boots?
          </li>
          <li className="rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-gray-800">
            The window was locked from the inside. What does that imply?
          </li>
        </ul>
      </section>
    </div>
  );
}
