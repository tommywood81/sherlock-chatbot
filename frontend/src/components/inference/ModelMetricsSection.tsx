import type { InferenceModelCard } from "../../types/inferenceTypes";

interface ModelMetricsSectionProps {
  card: InferenceModelCard | null;
  streamConfidence?: number | null;
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export default function ModelMetricsSection({ card, streamConfidence }: ModelMetricsSectionProps) {
  if (!card) return null;
  const hasAnything =
    card.answerTokenCount > 0 || card.latencyMs > 0 || card.tokensGenerated > 0;
  if (!hasAnything) {
    return null;
  }

  const rows: { label: string; value: string; hint?: string }[] = [
    { label: "Latency", value: card.latencyMs ? `${card.latencyMs} ms` : "—" },
    { label: "Tokens (answer)", value: String(card.answerTokenCount) },
    {
      label: "Mean P (answer)",
      value: card.answerTokenCount ? fmt(card.meanConfidence * 100, 1) + "%" : "—",
    },
    {
      label: "Avg −log P",
      value: card.answerTokenCount ? fmt(card.meanNegLogProb, 3) : "—",
      hint: "From chosen-token probabilities",
    },
    {
      label: "Approx. perplexity",
      value: card.answerTokenCount ? fmt(card.approxPerplexity, 2) : "—",
      hint: "exp(mean −log P)",
    },
    {
      label: "Mean entropy",
      value: card.answerTokenCount ? `${fmt(card.meanEntropyBits, 2)} bits` : "—",
      hint: "Top-k distribution per step",
    },
  ];

  if (streamConfidence != null && Number.isFinite(streamConfidence)) {
    rows.push({
      label: "Stream avg confidence",
      value: `${fmt(streamConfidence * 100, 1)}%`,
    });
  }

  return (
    <section className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Model metrics
      </h3>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
        {rows.map(({ label, value, hint }) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-mono text-gray-900 tabular-nums">{value}</dd>
            {hint && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{hint}</p>}
          </div>
        ))}
      </dl>
    </section>
  );
}
