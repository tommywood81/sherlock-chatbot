import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getEvaluation, type EvaluationResult } from "../api/client";

export default function Evaluation() {
  const [data, setData] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvaluation()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-gray-500">Loading evaluation…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }
  if (!data) return null;

  const categories = Object.entries(data.by_category || {}).map(([name, s]) => ({
    name,
    pass_rate: Math.round((s.pass_rate ?? 0) * 100),
    passed: s.passed,
    total: s.total,
  }));

  const summaryPie = [
    { name: "Passed", value: data.passed, color: "#374151" },
    { name: "Failed", value: data.total_tests - data.passed, color: "#d1d5db" },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Evaluation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Benchmark results for Sherlock Tiny LM.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total tests</p>
            <p className="font-mono text-lg text-gray-900">{data.total_tests}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Passed</p>
            <p className="font-mono text-lg text-gray-900">{data.passed}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pass rate</p>
            <p className="font-mono text-lg text-gray-900">
              {(data.pass_rate * 100).toFixed(1)}%
            </p>
          </div>
          {data.avg_response_time_s != null && (
            <div>
              <p className="text-xs text-gray-500">Avg latency</p>
              <p className="font-mono text-lg text-gray-900">
                {data.avg_response_time_s.toFixed(2)}s
              </p>
            </div>
          )}
        </div>
      </section>

      {summaryPie.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Pass / Fail
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summaryPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {summaryPie.map((_, i) => (
                    <Cell key={i} fill={summaryPie[i].color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Pass rate by category
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Pass rate"]}
                  labelFormatter={(n) => `Category: ${n}`}
                />
                <Bar dataKey="pass_rate" name="Pass rate %" fill="#374151" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {data.results && data.results.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 overflow-x-auto">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Sample results
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-600 font-medium">Category</th>
                <th className="text-left py-2 pr-4 text-gray-600 font-medium">Pass</th>
                <th className="text-left py-2 pr-4 text-gray-600 font-medium">Score</th>
                <th className="text-left py-2 max-w-[200px] text-gray-600 font-medium">Prompt</th>
              </tr>
            </thead>
            <tbody>
              {data.results.slice(0, 20).map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-800">{r.category}</td>
                  <td className="py-2 pr-4">{r.passed ? "✓" : "✗"}</td>
                  <td className="py-2 pr-4 font-mono">{(r.score * 100).toFixed(0)}%</td>
                  <td className="py-2 max-w-[200px] truncate text-gray-600" title={r.prompt}>
                    {r.prompt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
