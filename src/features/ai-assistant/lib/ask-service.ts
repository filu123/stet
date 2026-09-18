import type { AiSettings } from "@/types/ai";

import { requestCompletion } from "./provider-client";

/** One turn in the conversation shown in the AI assistant. */
export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

const ASK_SYSTEM_PROMPT = `You are the user's thoughtful reading and writing companion inside a document editor.
The document may be a draft, an article, a set of notes, or a summary of a book such as a psychology book.
Answer questions about the document's ideas, arguments, themes, evidence, and implications helpfully and accurately.
Use the document as your primary source. If the answer is not supported by the document, say so clearly and distinguish outside knowledge from what the document says.
When the user asks what to edit or improve, give specific, actionable advice tied to the actual text.
When a selected passage is provided, treat it as the focus while using the rest of the document for context.
Keep answers concise unless the user asks for depth. Plain text only — no markdown headings or fences.`;

const MAX_HISTORY_MESSAGES = 12;

/** Answers one turn of a conversation grounded in the current document. */
export async function askAboutDocument(
  documentText: string,
  question: string,
  settings: AiSettings,
  apiKey: string,
  history: readonly AiChatMessage[] = [],
  selectedText?: string,
): Promise<string> {
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  const conversation = recentHistory.length
    ? `\n\n<conversation>\n${recentHistory
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n")}\n</conversation>`
    : "";
  const selection = selectedText?.trim()
    ? `\n\n<selected-passage>\n${selectedText}\n</selected-passage>`
    : "";

  const answer = await requestCompletion({
    systemPrompt: ASK_SYSTEM_PROMPT,
    userPrompt: `<document>\n${documentText}\n</document>${selection}${conversation}\n\nQuestion: ${question}`,
    settings,
    apiKey,
  });
  return answer.trim();
}
