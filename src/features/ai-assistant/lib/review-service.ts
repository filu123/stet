import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

import type { AiSettings } from "@/types/ai";

import type { RawSuggestion, Suggestion } from "../types";

import { buildDocumentTextIndex, resolveQuoteRange } from "./position-mapper";
import { requestCompletion } from "./provider-client";
import { buildReviewUserPrompt, REVIEW_SYSTEM_PROMPT } from "./review-prompt";
import { parseReviewResponse } from "./suggestion-parser";

/**
 * The full review pipeline: document → prompt → provider → parse → resolve
 * positions. Suggestions whose quotes can't be located are silently dropped —
 * a wrong-position markup is worse than a missing one.
 */
export async function requestDocumentReview(
  doc: ProseMirrorNode,
  settings: AiSettings,
  apiKey: string,
): Promise<Suggestion[]> {
  const textIndex = buildDocumentTextIndex(doc);
  const modelOutput = await requestCompletion({
    systemPrompt: REVIEW_SYSTEM_PROMPT,
    userPrompt: buildReviewUserPrompt(textIndex.text),
    settings,
    apiKey,
  });
  const rawSuggestions = parseReviewResponse(modelOutput);

  return rawSuggestions.flatMap((rawSuggestion) => {
    const range = resolveQuoteRange(textIndex, rawSuggestion.quote, rawSuggestion.occurrence);
    if (!range) return [];
    return [toSuggestion(rawSuggestion, range.from, range.to)];
  });
}

function toSuggestion(rawSuggestion: RawSuggestion, from: number, to: number): Suggestion {
  const common = {
    id: crypto.randomUUID(),
    quote: rawSuggestion.quote,
    occurrence: rawSuggestion.occurrence,
    note: rawSuggestion.note,
    from,
    to,
  };

  if (rawSuggestion.kind === "grammar" || rawSuggestion.kind === "style") {
    return { ...common, kind: rawSuggestion.kind, replacement: rawSuggestion.replacement ?? "" };
  }
  return { ...common, kind: rawSuggestion.kind };
}
