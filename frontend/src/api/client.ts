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
  /** Required — no client-side defaults; must match server-reported metrics. */
  temperature: number;
  top_p: number;
  max_tokens: number;
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
            onToken(t, topCandidates);
          },
          (m) => {
            onMetrics?.(m);
          }
        )
      ) {
        // handled
      }
    }
  }
}

function assertFinite(name: string, v: number): void {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Invalid ${name}: must be a finite number`);
  }
}

export async function streamGenerate(
  params: GenerateParams,
  onToken: (token: string, topCandidates?: TopTokenCandidate[]) => void,
  onMetrics?: (m: StreamMetrics) => void
): Promise<void> {
  assertFinite("temperature", params.temperature);
  assertFinite("top_p", params.top_p);
  assertFinite("max_tokens", params.max_tokens);
  const body = {
    prompt: params.prompt.trim(),
    temperature: params.temperature,
    top_p: params.top_p,
    max_tokens: params.max_tokens,
  };
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  /** Echoed from /generate so the client can verify UI matches the model. */
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

/** Sampling params chosen in the UI; must match server-reported metrics. */
export interface SamplingParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

const EPS = 1e-5;

export function validateSamplingParamsAgainstMetrics(
  selected: SamplingParams,
  m: StreamMetrics | null
): { ok: true } | { ok: false; message: string } {
  if (!m) {
    return {
      ok: false,
      message: "Server did not return metrics; cannot verify sampling parameters.",
    };
  }
  if (m.temperature === undefined || m.top_p === undefined || m.max_tokens === undefined) {
    return {
      ok: false,
      message:
        "Server did not confirm sampling parameters (temperature, top_p, max_tokens)." +
        " Ensure the backend is up to date.",
    };
  }
  if (Math.abs(m.temperature - selected.temperature) > EPS) {
    return {
      ok: false,
      message: `Temperature mismatch: selected ${selected.temperature} but the model used ${m.temperature}.`,
    };
  }
  if (Math.abs(m.top_p - selected.top_p) > EPS) {
    return {
      ok: false,
      message: `top_p mismatch: selected ${selected.top_p} but the model used ${m.top_p}.`,
    };
  }
  if (m.max_tokens !== selected.max_tokens) {
    return {
      ok: false,
      message: `max_tokens mismatch: selected ${selected.max_tokens} but the model used ${m.max_tokens}.`,
    };
  }
  return { ok: true };
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
