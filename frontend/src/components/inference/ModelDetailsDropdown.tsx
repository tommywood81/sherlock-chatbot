import { Link } from "react-router-dom";

export default function ModelDetailsDropdown() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3">
      <details className="group relative">
        <summary className="cursor-pointer list-none rounded-md px-2 py-1 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 [&::-webkit-details-marker]:hidden">
          Model Details ▾
        </summary>
        <div className="mt-1 rounded-md border border-gray-200 bg-white p-2.5 shadow-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[12px] leading-snug">
            <span className="text-slate-500">Model:</span>
            <span className="font-mono text-slate-800">HF 3.2 (1B)</span>
            <span className="text-slate-500">Inference:</span>
            <span className="font-mono text-slate-800">4-bit quantised</span>
            <span className="text-slate-500">Mode:</span>
            <span className="font-mono text-slate-800">real-time generation</span>
            <span className="text-slate-500">Fine-tuning:</span>
            <span className="font-mono text-slate-800">instruction-tuned</span>
          </div>
          <div className="my-2 h-px bg-gray-200" />
          <Link to="/architecture" className="text-[12px] font-medium text-sky-700 hover:text-sky-900">
            View full architecture details →
          </Link>
        </div>
      </details>
    </section>
  );
}
