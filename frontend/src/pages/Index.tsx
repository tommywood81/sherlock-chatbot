import { useState, useCallback } from "react";
import { streamInfer } from "../api/client";

const SUGGESTED_PROMPTS = [
  "Summarise the mystery of the Speckled Band",
  "What clues reveal the criminal?",
  "Explain Holmes deduction process",
  "What is the key evidence in the case?",
  "Who is the most suspicious character?",
  "Analyse the motive of the suspect",
  "Explain Holmes reasoning step by step",
  "What clues would Holmes investigate next?",
  "Summarise the case like Sherlock Holmes",
  "Identify the most important evidence",
];

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPrompt = useCallback(async (text: string) => {
    const toSend = (text || prompt).trim();
    if (!toSend || loading) return;
    setError(null);
    setResponse("");
    setLoading(true);
    try {
      const stream = await streamInfer(toSend);
      const reader = stream.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const token = line.slice(6);
            if (token) {
              full += token;
              setResponse(full);
            }
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, loading]);

  const onSuggested = (s: string) => {
    setPrompt(s);
    sendPrompt(s);
  };

  return (
    <div className="index-page">
      <h1 style={{ marginTop: 0 }}>Ask Sherlock</h1>
      <p className="muted">Powered by Llama 3.2 1B — responses stream in real time.</p>

      <div className="input-row">
        <textarea
          className="prompt-input"
          placeholder="Ask about a case, deduction, or evidence…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendPrompt(prompt);
            }
          }}
          rows={3}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={() => sendPrompt(prompt)}
          disabled={loading || !prompt.trim()}
        >
          {loading ? "Generating…" : "Send"}
        </button>
      </div>

      <p className="suggested-label">Suggested prompts</p>
      <div className="suggested-grid">
        {SUGGESTED_PROMPTS.map((s) => (
          <button
            key={s}
            type="button"
            className="suggested-btn"
            onClick={() => onSuggested(s)}
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>

      {(response || loading) && (
        <div className="response-box">
          <h2>Response</h2>
          {loading && response === "" && (
            <p className="typing-indicator">Thinking…</p>
          )}
          <div className="response-text">{response || (loading ? "…" : "")}</div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
