import { useEffect, useState } from "react";
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

  if (loading) return <p className="muted">Loading evaluation…</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!data) return null;

  const categories = Object.entries(data.by_category || {});

  return (
    <div className="evaluation-page">
      <h1>Evaluation Results</h1>
      <p className="muted">Benchmark results for the Sherlock Holmes model.</p>

      <section className="metrics-section">
        <h2>Summary</h2>
        <table className="metrics-table">
          <tbody>
            <tr><td>Total tests</td><td>{data.total_tests}</td></tr>
            <tr><td>Passed</td><td>{data.passed}</td></tr>
            <tr><td>Pass rate</td><td>{(data.pass_rate * 100).toFixed(1)}%</td></tr>
            {data.avg_response_time_s != null && (
              <tr><td>Avg response time</td><td>{data.avg_response_time_s}s</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="categories-section">
        <h2>By capability</h2>
        <table className="results-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Tests</th>
              <th>Passed</th>
              <th>Pass rate</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(([name, stats]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{stats.total}</td>
                <td>{stats.passed}</td>
                <td>{(stats.pass_rate * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.results && data.results.length > 0 && (
        <section className="results-section">
          <h2>Example results</h2>
          <table className="results-table wide">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Prompt</th>
                <th>Pass</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {data.results.slice(0, 15).map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.category}</td>
                  <td className="prompt-cell">{r.prompt}</td>
                  <td>{r.passed ? "✓" : "✗"}</td>
                  <td className="summary-cell">
                  {(() => {
                    const t = r.behaviour_summary || r.output || "";
                    return t ? (t.length > 120 ? `${t.slice(0, 120)}…` : t) : "—";
                  })()}
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
