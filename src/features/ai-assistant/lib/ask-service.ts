import type { AiSettings } from "@/types/ai";

import { requestCompletion } from "./provider-client";

const ASK_SYSTEM_PROMPT = `You are the user's writing assistant inside their document editor.
Answer their question helpfully and concisely (a few sentences unless more is clearly needed).
When asked what to edit or improve, give specific, actionable advice referencing their actual text.
Plain text only — no markdown headings or fences.`;

/** Single-turn Q&A about the current document. */
export async function askAboutDocument(
  documentText: string,
  question: string,
  settings: AiSettings,
  apiKey: string,
): Promise<string> {
  const answer = await requestCompletion({
    systemPrompt: ASK_SYSTEM_PROMPT,
    userPrompt: `<document>\n${documentText}\n</document>\n\nQuestion: ${question}`,
    settings,
    apiKey,
  });
  return answer.trim();
}
