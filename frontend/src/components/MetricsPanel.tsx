import type { StreamMetrics } from "../api/client";
import ConfidenceInfo from "./ConfidenceInfo";

interface MetricsPanelProps {
  metrics: StreamMetrics | null;
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  const items = [
    { label: "tokens/sec", value: metrics?.tokens_per_second?.toFixed(2) ?? "—" },
    { label: "latency", value: metrics?.latency_ms != null ? `${metrics.latency_ms} ms` : "—" },
    { label: "RAM", value: metrics?.memory_usage_mb != null ? `${metrics.memory_usage_mb} MB` : "—" },
    { label: "context", value: metrics?.context_usage ?? "—" },
  ];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Metrics
      </h3>
      <dl className="space-y-2 font-mono text-sm">
        {items.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-gray-400">Updated after each inference.</p>
      <ConfidenceInfo confidence={(metrics as StreamMetrics & { confidence?: number })?.confidence ?? null} />
    </div>
  );
}
