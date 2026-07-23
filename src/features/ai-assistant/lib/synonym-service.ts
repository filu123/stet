import type { AiSettings } from "@/types/ai";

import { requestCompletion } from "./provider-client";

const SYNONYM_SYSTEM_PROMPT = `You suggest replacement words or short phrases for a highlighted span in the user's writing.
Given the span and the sentence it sits in, reply with 4 to 6 natural alternatives that fit that exact context and keep the original meaning, tense, and part of speech.
One alternative per line. No numbering, no bullets, no quotes, no commentary, no explanations. Do not repeat the original span.`;

/** How much surrounding text is worth sending as context. */
const MAX_CONTEXT_CHARS = 400;

/**
 * Asks the model for in-context replacements for `selectedText`.
 * Returns a de-duplicated, cleaned list of options (may be empty).
 */
export async function requestSynonyms(
  selectedText: string,
  context: string,
  settings: AiSettings,
  apiKey: string,
): Promise<string[]> {
  const sentence = context.slice(0, MAX_CONTEXT_CHARS);
  const modelOutput = await requestCompletion({
    systemPrompt: SYNONYM_SYSTEM_PROMPT,
    userPrompt: `Sentence: ${sentence}\n\nReplace this span: ${selectedText}`,
    settings,
    apiKey,
  });
  return parseSynonyms(modelOutput, selectedText);
}

function parseSynonyms(modelOutput: string, original: string): string[] {
  const normalizedOriginal = original.trim().toLowerCase();
  const cleaned = modelOutput
    .split("\n")
    .map((line) =>
      line
        // strip leading bullets/numbering and surrounding quotes
        .replace(/^[\s\-*•\d.)]+/, "")
        .replace(/^["'“”]+|["'“”]+$/g, "")
        .trim(),
    )
    .filter((line) => line.length > 0 && line.toLowerCase() !== normalizedOriginal);

  // de-duplicate case-insensitively, keep order, cap the list
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const option of cleaned) {
    const key = option.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(option);
    if (unique.length === 6) break;
  }
  return unique;
}
