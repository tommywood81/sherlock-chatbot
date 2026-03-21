import type { AlternativeBranchData } from "../../types/inferenceDemo";
import AlternativeCard from "./AlternativeCard";

interface AlternativeAnswersProps {
  alternatives: AlternativeBranchData[];
  loading: boolean;
  hasDivergence: boolean;
}

export default function AlternativeAnswers({
  alternatives,
  loading,
  hasDivergence,
}: AlternativeAnswersProps) {
  return (
    <section className="space-y-4" aria-label="Alternative answer paths">
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          What if a different &lsquo;best-fit&rsquo; word was chosen?
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Three branches from the first meaningful step where another word was almost as likely.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-400 py-6">Exploring alternative paths…</p>
      )}

      {!loading && !hasDivergence && (
        <p className="text-sm text-gray-500 py-4 border border-dashed border-gray-200 rounded-lg px-4">
          For this answer, every step was already very confident — there’s no strong alternate path to
          show.
        </p>
      )}

      {!loading && hasDivergence && alternatives.length === 0 && (
        <p className="text-sm text-gray-500 py-4">
          The API didn’t return enough runner-up words at that step to build branches.
        </p>
      )}

      {!loading && alternatives.length > 0 && (
        <div className="flex flex-col gap-4">
          {alternatives.map((b) => (
            <AlternativeCard key={`${b.pathNumber}-${b.altToken}`} branch={b} />
          ))}
        </div>
      )}
    </section>
  );
}
