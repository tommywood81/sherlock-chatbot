/**
 * Text the API sends to the model for /api/generate (inference dashboard).
 * Mirrors `backend/app/routes/infer.py` — update both if the template changes.
 */

export const LLAMA_BEGIN = "<|begin_of_text|>";
export const HDR_SYS = "<|start_header_id|>system<|end_header_id|>";
export const HDR_USER = "<|start_header_id|>user<|end_header_id|>";
export const HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>";
export const EOT = "<|eot_id|>";

/** Same string as `SYSTEM_MSG_REASONING` in infer.py */
export const SYSTEM_MSG_REASONING =
  "You are Sherlock, an AI assistant that provides clear, accurate answers in natural language.\n" +
  "Maintain a calm, analytical tone. Do not roleplay. Do not expose raw chain-of-thought.\n" +
  "\n" +
  "When reasoning is requested:\n" +
  "- Output a short, structured reasoning summary (no raw chain-of-thought).\n" +
  "- Then output the final answer.\n" +
  "\n" +
  "Format (for UI parsing):\n" +
  "[REASONING]\n" +
  "<structured reasoning summary>\n" +
  "[ANSWER]\n" +
  "<final answer>\n";

/** Same string as `SYSTEM_MSG` in infer.py (answer-only mode). */
export const SYSTEM_MSG =
  "You are Sherlock, an AI assistant that provides clear, accurate answers in natural language. " +
  "Maintain a calm, analytical tone. Do not roleplay. Do not expose raw chain-of-thought. " +
  "Keep responses concise and readable.";

/**
 * Full prompt prefix the model sees before it generates the next token
 * (system + user message + assistant header + `[REASONING]` starter).
 */
export function buildInferencePromptPreview(
  userMessage: string,
  opts?: { showReasoning?: boolean }
): string {
  const u = userMessage.trim();
  const showReasoning = opts?.showReasoning ?? false;
  const system = showReasoning ? SYSTEM_MSG_REASONING : SYSTEM_MSG;
  return (
    `${LLAMA_BEGIN}\n` +
    `${HDR_SYS}\n${system}${EOT}\n\n` +
    `${HDR_USER}\n${u}\n${EOT}\n\n` +
    `${HDR_ASSIST}\n` +
    (showReasoning ? `[REASONING]\n` : "")
  );
}
