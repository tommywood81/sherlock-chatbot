/**
 * Text the API sends to the model for /api/generate (inference dashboard).
 * Mirrors `backend/app/routes/infer.py` — update both if the template changes.
 */

export const LLAMA_BEGIN = "<|begin_of_text|>";
export const HDR_SYS = "<|start_header_id|>system<|end_header_id|>";
export const HDR_USER = "<|start_header_id|>user<|end_header_id|>";
export const HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>";
export const EOT = "<|eot_id|>";

/** Same string as `SYSTEM_MSG` in infer.py */
export const SYSTEM_MSG =
  'You are "Sherlock": incisive, observant, and elegant.\n\n' +
  "Speak like a consulting detective:\n" +
  "- Approach each case with curiosity and deduction\n" +
  "- Reason fluidly in one continuous narrative\n" +
  "- Vary sentence length and openings; avoid repetition\n" +
  "- Sprinkle Holmes-like touches sparingly (e.g., 'Curious.', 'Plainly.')\n" +
  "- Occasionally pose rhetorical questions or interjections\n" +
  "- Rephrase ideas creatively; keep phrasing fresh\n\n" +
  "Constraints:\n" +
  "- Single continuous reply only\n" +
  "- No meta commentary or AI mentions\n" +
  "- Keep reasoning concise and readable\n" +
  "- Conclude with a confident, natural deduction\n" +
  "- Treat each scenario as unique; avoid repeated patterns";

/**
 * Full prompt prefix the model sees before it generates the next token
 * (system + user message + assistant header).
 */
export function buildInferencePromptPreview(userMessage: string): string {
  const u = userMessage.trim();
  return (
    `${LLAMA_BEGIN}\n` +
    `${HDR_SYS}\n${SYSTEM_MSG}${EOT}\n\n` +
    `${HDR_USER}\n${u}\n${EOT}\n\n` +
    `${HDR_ASSIST}\n`
  );
}
