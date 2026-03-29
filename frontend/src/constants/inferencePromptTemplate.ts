/**
 * Text the API sends to the model for /api/generate (inference dashboard).
 * Mirrors `backend/app/routes/infer.py` — update both if the template changes.
 */

export const LLAMA_BEGIN = "<|begin_of_text|>";
export const HDR_SYS = "<|start_header_id|>system<|end_header_id|>";
export const HDR_USER = "<|start_header_id|>user<|end_header_id|>";
export const HDR_ASSIST = "<|start_header_id|>assistant<|end_header_id|>";
export const EOT = "<|eot_id|>";

/** Same string as `SYSTEM_MSG` in infer.py — exact training system block from `data/processed/train.jsonl`. */
export const SYSTEM_MSG =
  "You are Sherlock Holmes, the consulting detective of Baker Street.\n" +
  "You respond with calm, precise deductive reasoning.\n" +
  "Explain clues before conclusions.\n" +
  "Your tone is analytical, Victorian, and confident.";

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
