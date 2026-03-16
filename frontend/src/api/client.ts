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

// --- Sherlock session-aware API ---

export interface MysteryCase {
  title: string;
  suspects: string[];
  clues: string[];
}

export interface MysteryResponse {
  session_id: string;
  case: MysteryCase;
}

export async function generateMystery(seed?: string): Promise<MysteryResponse> {
  const res = await fetch(`${API_BASE}/generate-mystery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface AskResponse {
  session_id: string;
  answer: string;
  case?: MysteryCase | null;
}

export async function askSherlock(prompt: string): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask-sherlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface ExplainResponse {
  session_id: string;
  explanation: string;
}

export async function explainDeduction(): Promise<ExplainResponse> {
  const res = await fetch(`${API_BASE}/explain-deduction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type TestType = "generalisation" | "memorisation" | "reasoning" | "consistency";

export interface RunTestResponse {
  session_id: string;
  question_id: string;
  test_type: TestType;
  prompt: string;
  expected_answer: string;
}

export async function runTest(test_type: TestType): Promise<RunTestResponse> {
  const params = new URLSearchParams({ test_type });
  const res = await fetch(`${API_BASE}/run-test?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface EvaluateRequestBody {
  question_id: string;
  test_type: TestType;
  expected_answer: string;
  model_answer: string;
}

export interface EvaluateResponseBody {
  session_id: string;
  score: number;
}

export async function evaluateAnswer(
  body: EvaluateRequestBody,
): Promise<EvaluateResponseBody> {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface SamplePromptResponse {
  session_id: string;
  kind: string;
  prompt: string;
}

export async function getSamplePrompt(kind: "watson" | "tiny-mystery" | "eiffel") {
  const params = new URLSearchParams({ kind });
  const res = await fetch(`${API_BASE}/sample-prompt?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SamplePromptResponse;
}
