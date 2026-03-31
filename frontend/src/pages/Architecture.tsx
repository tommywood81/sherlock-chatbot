import { Link } from "react-router-dom";

export default function Architecture() {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[720px] space-y-8">
        <Link to="/" className="text-sm font-medium text-sky-800 hover:text-sky-950">
          ← Inference
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Architecture</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            How this demo is wired together — nothing fancy, just a browser, an API, and one loaded model.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">System design</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Two containers: a <strong>React</strong> frontend (served as static assets) and a <strong>FastAPI</strong> backend.
            Only the frontend port is published; the browser talks to <code className="rounded bg-slate-100 px-1 text-[13px]">/api</code>,
            which the frontend proxy forwards to the backend on the internal network. The GGUF file lives on a volume under{" "}
            <code className="rounded bg-slate-100 px-1 text-[13px]">./models</code>; the backend reads{" "}
            <code className="rounded bg-slate-100 px-1 text-[13px]">MODEL_PATH</code> from the environment (see{" "}
            <code className="rounded bg-slate-100 px-1 text-[13px]">docker-compose.yml</code>).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Model</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            <strong>Sherlock 1B</strong> starts from Meta Llama 3.2 1B Instruct, gets a LoRA fine-tune on Sherlock-style dialogue,
            then merged weights are exported to <strong>GGUF</strong> and <strong>4-bit quantized</strong> for CPU-friendly
            inference. At runtime the backend uses <strong>llama-cpp-python</strong> (llama.cpp under the hood): the model loads
            once at startup, then answers stream out token-by-token.
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            Context length for this deployment is <strong>2,048</strong> tokens (<code className="text-[13px]">N_CTX</code>).
            For a fuller fact sheet, see the <Link to="/model-card" className="font-medium text-sky-800 hover:text-sky-950">Model card</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Training and fine-tuning</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Offline pipeline: curated <strong>instruction–response pairs</strong> → <strong>JSONL</strong> →{" "}
            <strong>QLoRA</strong> on GPU → <strong>merge</strong> adapters into full weights → <strong>convert / quantize</strong>{" "}
            with llama.cpp. Versioned artifact names and bump scripts live in the repo so you can re-train without clobbering the
            last good GGUF. The README has the loss / convergence table and the exact merge + GGUF commands.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Inference in the UI</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            The dashboard sends the user message to <code className="rounded bg-slate-100 px-1 text-[13px]">POST /api/generate</code>{" "}
            with sampling settings. The response is <strong>Server-Sent Events</strong>: JSON lines with tokens (and top alternatives
            for the token inspector), then a final metrics object. There is no separate “reasoning” channel — one stream, shaped by
            the system prompt and chat template (<code className="text-[13px]">system</code> / <code className="text-[13px]">user</code> /{" "}
            <code className="text-[13px]">assistant</code> headers and <code className="text-[13px]">&lt;|eot_id|&gt;</code> delimiters).
          </p>
        </section>
      </div>
    </div>
  );
}
