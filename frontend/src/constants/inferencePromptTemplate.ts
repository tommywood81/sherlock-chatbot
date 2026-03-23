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
  "You are Sherlock Holmes.\n" +
  "When answering:\n" +
  "You MUST output exactly two sections, in this exact order, with these exact headers:\n" +
  "[REASONING]\n" +
  "<your reasoning>\n" +
  "[ANSWER]\n" +
  "<your final answer>\n" +
  "\n" +
  "Rules:\n" +
  "- Always include the literal header [ANSWER] and at least one sentence after it.\n" +
  "- Keep [REASONING] concise (1–5 short lines).\n" +
  "- Give direct, varied conclusions.\n";

/**
 * Full prompt prefix the model sees before it generates the next token
 * (system + user message + assistant header + `[REASONING]` starter).
 */
export function buildInferencePromptPreview(userMessage: string): string {
  const u = userMessage.trim();
  return (
    `${LLAMA_BEGIN}\n` +
    `${HDR_SYS}\n${SYSTEM_MSG_REASONING}${EOT}\n\n` +
    `${HDR_USER}\n${u}\n${EOT}\n\n` +
    `${HDR_ASSIST}\n` +
    `[REASONING]\n`
  );
}
