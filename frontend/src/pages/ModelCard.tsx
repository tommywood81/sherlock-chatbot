import { useEffect, useState } from "react";
import { getModelCard, type ModelCardData } from "../api/client";

export default function ModelCard() {
  const [data, setData] = useState<ModelCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModelCard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading model card…</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!data) return null;

  const overview = data.model_overview || {};
  const bench = data.benchmark_results || {};
  const caps = bench.capabilities || [];

  return (
    <div className="model-card-page">
      <h1>Model Card</h1>
      <p className="muted">Sherlock Holmes — Llama 3.2 1B fine-tuned for deductive dialogue.</p>

      <section>
        <h2>Model overview</h2>
        <table className="metrics-table">
          <tbody>
            {Object.entries(overview).map(([k, v]) => (
              <tr key={k}><td>{k.replace(/_/g, " ")}</td><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Evaluation methodology</h2>
        <p>{data.evaluation_methodology}</p>
      </section>

      <section>
        <h2>Benchmark results</h2>
        <table className="metrics-table">
          <tbody>
            <tr><td>Total tests</td><td>{bench.total_tests}</td></tr>
            <tr><td>Passed</td><td>{bench.passed}</td></tr>
            <tr><td>Pass rate</td><td>{(bench.pass_rate * 100).toFixed(1)}%</td></tr>
            <tr><td>Avg response time</td><td>{bench.avg_response_time_s}s</td></tr>
          </tbody>
        </table>
        {caps.length > 0 && (
          <table className="results-table">
            <thead>
              <tr><th>Capability</th><th>Tests</th><th>Passed</th><th>Rate</th></tr>
            </thead>
            <tbody>
              {caps.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td><td>{c.total}</td><td>{c.passed}</td>
                  <td>{(c.pass_rate * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Limitations</h2>
        <ul>
          {(data.limitations || []).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Intended use</h2>
        <p>{data.intended_use}</p>
      </section>
    </div>
  );
}
