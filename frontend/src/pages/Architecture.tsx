import { Link } from "react-router-dom";

export default function Architecture() {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[800px] space-y-8">
        <Link to="/" className="text-sm font-medium text-sky-700 hover:text-sky-900">
          ← Back to Ask a Question
        </Link>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Architecture Overview
          </h1>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-slate-900">Model Overview</h2>
          <p className="text-sm text-slate-600">Content coming soon...</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-slate-900">Training &amp; Fine-tuning</h2>
          <p className="text-sm text-slate-600">Content coming soon...</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-slate-900">Inference Details</h2>
          <p className="text-sm text-slate-600">Content coming soon...</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-slate-900">System Design</h2>
          <p className="text-sm text-slate-600">Content coming soon...</p>
        </section>
      </div>
    </div>
  );
}
