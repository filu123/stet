import type { AiSettings } from "@/types/ai";

import { requestCompletion } from "./provider-client";

export type RewriteAction = "improve" | "shorten" | "expand" | "fix";

const REWRITE_SYSTEM_PROMPT = `You are a writing assistant. You rewrite a snippet of the user's text.
Reply ONLY with the rewritten text — no quotes around it, no commentary, no markdown fences.
Keep the same language, person, and tense as the original unless the instruction says otherwise.
IMPORTANT: If the instruction doesn't genuinely apply — the text already satisfies it and any change would be change for its own sake — return the original text EXACTLY as given, character for character. Never invent improvements.`;

const ACTION_INSTRUCTIONS: Record<RewriteAction, string> = {
  improve: "Rewrite this text to be clearer and more polished. Keep the meaning and roughly the same length. If it is already clear and well written, return it unchanged.",
  shorten: "Rewrite this text to be significantly more concise while preserving the full meaning. If it is already as concise as it can be, return it unchanged.",
  expand: "Expand this text with more detail and depth, staying in the same voice.",
  fix: "Fix ONLY grammar, spelling, and punctuation errors. Keep the wording and style otherwise identical. If there are no errors, return the text unchanged — do not rephrase anything.",
};

export const ACTION_NOTES: Record<RewriteAction, string> = {
  improve: "Improved version",
  shorten: "Shorter version",
  expand: "Expanded version",
  fix: "Grammar fixed",
};

/** Rewrites the selected text; returns the replacement candidate. */
export async function requestRewrite(
  selectedText: string,
  action: RewriteAction,
  settings: AiSettings,
  apiKey: string,
): Promise<string> {
  const modelOutput = await requestCompletion({
    systemPrompt: REWRITE_SYSTEM_PROMPT,
    userPrompt: `${ACTION_INSTRUCTIONS[action]}\n\n<text>\n${selectedText}\n</text>`,
    settings,
    apiKey,
  });
  return cleanModelText(modelOutput);
}

const CONTINUE_SYSTEM_PROMPT = `You are a ghostwriter continuing the user's document.
Write the next one to three sentences, matching the document's voice, tone, and language exactly.
Reply ONLY with the continuation text — no quotes, no commentary, no markdown fences. Do not repeat existing text.`;

/** Max characters of document tail sent as continuation context. */
const CONTINUATION_CONTEXT_CHARS = 4000;

export async function requestContinuation(
  documentText: string,
  settings: AiSettings,
  apiKey: string,
): Promise<string> {
  const contextTail = documentText.slice(-CONTINUATION_CONTEXT_CHARS);
  const modelOutput = await requestCompletion({
    systemPrompt: CONTINUE_SYSTEM_PROMPT,
    userPrompt: `Continue this document:\n\n<document>\n${contextTail}\n</document>`,
    settings,
    apiKey,
  });
  return cleanModelText(modelOutput);
}

/** Strips stray fences/quotes models sometimes wrap around plain-text replies. */
function cleanModelText(modelOutput: string): string {
  let text = modelOutput.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }
  return text;
}
