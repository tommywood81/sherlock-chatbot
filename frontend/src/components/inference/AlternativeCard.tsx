import type { AlternativeBranchData } from "../../types/inferenceDemo";

function pct(p: number): string {
  return `${Math.round(p * 1000) / 10}%`;
}

interface AlternativeCardProps {
  branch: AlternativeBranchData;
}

/** One simulated path: different high-probability token at a key step → new answer. */
export default function AlternativeCard({ branch }: AlternativeCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
      <header>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Alternative path #{branch.pathNumber}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          At one step, the model chose a different high-probability word.
        </p>
      </header>

      <ul className="rounded-md bg-sky-50/80 border border-sky-100 px-3 py-2 text-sm text-gray-800 space-y-1 list-disc list-inside">
        <li>
          <span className="text-gray-500">Instead of </span>
          <span className="font-semibold text-sky-800">
            &ldquo;{branch.originalToken}&rdquo; ({pct(branch.originalProb)})
          </span>
        </li>
        <li>
          <span className="text-gray-500">Chose </span>
          <span className="font-semibold text-sky-700">
            &ldquo;{branch.altToken}&rdquo; ({pct(branch.altProb)})
          </span>
        </li>
      </ul>

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Result</p>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{branch.result}</p>
      </div>
    </article>
  );
}
