/**
 * API client for Sherlock. Uses /api so Vite proxy or nginx forwards to the backend.
 */

const API_BASE = "/api";

/** One candidate next-token with approximate probability (from top-k logprobs). */
export interface TopTokenCandidate {
  token: string;
  prob?: number;
}

export interface GenerateParams {
  prompt: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

function parseSSELine(
  payload: string,
  onToken: (t: string, topCandidates?: TopTokenCandidate[]) => void,
  onMetrics?: (m: StreamMetrics) => void
): boolean {
  if (payload === "[DONE]" || payload === "") return false;
  try {
    const data = JSON.parse(payload) as {
      token?: string;
      /** Backend field name (top-k at this step). */
      alternatives?: TopTokenCandidate[];
      metrics?: StreamMetrics;
    };
    if (data.token !== undefined) {
      onToken(data.token, data.alternatives);
      return true;
    }
    if (data.metrics) {
      onMetrics?.(data.metrics);
    }
    return false;
  } catch {
    if (payload.startsWith("[Error:")) return false;
    onToken(payload);
    return true;
  }
}

async function consumeSseTokenStream(
  res: Response,
  onToken: (token: string, topCandidates?: TopTokenCandidate[]) => void,
  onMetrics?: (m: StreamMetrics) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let metrics: StreamMetrics | null = null;
  const start = performance.now();
  let tokenCount = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (
        parseSSELine(
          payload,
          (t, topCandidates) => {
            tokenCount++;
            onToken(t, topCandidates);
          },
          (m) => {
            metrics = m;
            onMetrics?.(m);
          }
        )
      ) {
        // handled
      }
    }
  }
  const latencyMs = Math.round(performance.now() - start);
  if (!metrics && tokenCount > 0) {
    onMetrics?.({
      latency_ms: latencyMs,
      tokens_per_second: tokenCount / (latencyMs / 1000),
      tokens_generated: tokenCount,
    });
  } else if (metrics) {
    onMetrics?.(metrics);
  }
}

export async function streamGenerate(
  params: GenerateParams,
  onToken: (token: string, topCandidates?: TopTokenCandidate[]) => void,
  onMetrics?: (m: StreamMetrics) => void
): Promise<void> {
  const body = {
    prompt: params.prompt.trim(),
    temperature: params.temperature ?? 0.5,
    top_p: params.top_p ?? 0.9,
    max_tokens: params.max_tokens ?? 64,
  };
  let res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    res = await fetch(`${API_BASE}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: body.prompt }),
    });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
  }
  await consumeSseTokenStream(res, onToken, onMetrics);
}

export interface StreamMetrics {
  latency_ms?: number;
  tokens_per_second?: number;
  memory_usage_mb?: number;
  context_usage?: number;
  tokens_generated?: number;
  confidence?: number;
}

export interface EvaluationResult {
  total_tests: number;
  passed: number;
  pass_rate: number;
  avg_response_time_s?: number;
  by_category: Record<string, { total: number; passed: number; pass_rate: number }>;
  results: Array<{
    id: string;
    category: string;
    prompt: string;
    output: string;
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
