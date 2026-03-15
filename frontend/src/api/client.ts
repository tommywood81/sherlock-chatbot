/**
 * API client: infer (streaming), evaluation, model-card.
 * Uses relative /api so Vite proxy or same-origin in production works.
 */

const API_BASE = "/api";

export interface InferResponse {
  stream: ReadableStream<Uint8Array>;
}

export async function streamInfer(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${API_BASE}/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const stream = res.body;
  if (!stream) throw new Error("No response body");
  return stream;
}

export interface EvaluationResult {
  total_tests: number;
  passed: number;
  pass_rate: number;
  output_rate?: number;
  avg_response_time_s?: number;
  by_category: Record<string, { total: number; passed: number; pass_rate: number }>;
  results: Array<{
    id: string;
    category: string;
    prompt: string;
    output: string;
    behaviour_summary?: string;
    score: number;
    passed: boolean;
    response_time_s?: number;
  }>;
}

export async function getEvaluation(): Promise<EvaluationResult> {
  const res = await fetch(`${API_BASE}/evaluation`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface ModelCardData {
  model_overview: Record<string, string>;
  evaluation_methodology: string;
  benchmark_results: {
    total_tests: number;
    passed: number;
    pass_rate: number;
    avg_response_time_s: number;
    capabilities: Array<{ name: string; total: number; passed: number; pass_rate: number }>;
  };
  limitations: string[];
  intended_use: string;
}

export async function getModelCard(): Promise<ModelCardData> {
  const res = await fetch(`${API_BASE}/model-card`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
