import type { StreamMetrics } from "../api/client";
import ConfidenceInfo from "./ConfidenceInfo";

export interface DemoMetrics {
  latencyMs: number;
  avgConfidencePct: number;
  decisionSensitivityPct: number;
}

interface MetricsPanelProps {
  streamMetrics: StreamMetrics | null;
  demoMetrics: DemoMetrics | null;
}

const MODEL_INFO = [
  { label: "Model", value: "Sherlock-3.2 (1B parameters)" },
  { label: "Type", value: "Reasoning-tuned language model" },
  { label: "Quantization", value: "4-bit GGUF" },
] as const;

export default function MetricsPanel({ streamMetrics, demoMetrics }: MetricsPanelProps) {
  const latency =
    demoMetrics?.latencyMs != null && demoMetrics.latencyMs > 0
      ? `${demoMetrics.latencyMs} ms`
      : streamMetrics?.latency_ms != null
        ? `${streamMetrics.latency_ms} ms`
        : "—";

  const avgConf =
    demoMetrics != null && demoMetrics.avgConfidencePct > 0
      ? `${demoMetrics.avgConfidencePct}%`
      : streamMetrics?.confidence != null
        ? `${Math.round(streamMetrics.confidence * 1000) / 10}%`
        : "—";

  const sensitivity =
    demoMetrics != null ? `${demoMetrics.decisionSensitivityPct}%` : "—";

  const runtimeRows = [
    { label: "Latency", value: latency },
    { label: "Avg token confidence", value: avgConf },
    { label: "Decision sensitivity", value: sensitivity },
    { label: "Tokens/sec", value: streamMetrics?.tokens_per_second?.toFixed(2) ?? "—" },
    { label: "RAM", value: streamMetrics?.memory_usage_mb != null ? `${streamMetrics.memory_usage_mb} MB` : "—" },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">About this model</h3>
      <dl className="space-y-2 text-sm">
        {MODEL_INFO.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-gray-400 text-xs">{label}</dt>
            <dd className="text-gray-900 leading-snug">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 pt-2 border-t border-gray-100">
        Run metrics
      </h3>
      <dl className="space-y-2 font-mono text-sm">
        {runtimeRows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-900 text-right">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-gray-400">Values update after each run.</p>
      <ConfidenceInfo confidence={streamMetrics?.confidence ?? null} />
    </div>
  );
}
