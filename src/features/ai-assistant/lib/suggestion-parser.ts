import type { RawSuggestion, SuggestionKind } from "../types";

const VALID_KINDS: readonly SuggestionKind[] = ["grammar", "style", "highlight", "circle"];

/**
 * Parses raw model output into validated RawSuggestions.
 * Tolerant of markdown fences and surrounding prose (models add them despite
 * instructions); intolerant of anything that isn't a well-formed suggestion —
 * invalid entries are dropped, unparseable output throws a user-friendly error.
 */
export function parseReviewResponse(modelOutput: string): RawSuggestion[] {
  const jsonText = extractJsonArray(modelOutput);
  if (jsonText === null) {
    throw new Error("The AI response could not be read. Try running the review again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("The AI response could not be read. Try running the review again.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("The AI response could not be read. Try running the review again.");
  }

  return parsed.flatMap((entry) => {
    const suggestion = toRawSuggestion(entry);
    return suggestion ? [suggestion] : [];
  });
}

/** The outermost [...] span — survives ```json fences and stray prose. */
export function extractJsonArray(modelOutput: string): string | null {
  const start = modelOutput.indexOf("[");
  const end = modelOutput.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return modelOutput.slice(start, end + 1);
}

function toRawSuggestion(entry: unknown): RawSuggestion | null {
  if (typeof entry !== "object" || entry === null) return null;
  const candidate = entry as Record<string, unknown>;

  const kind = candidate.kind;
  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as SuggestionKind)) return null;

  const quote = candidate.quote;
  if (typeof quote !== "string" || quote.trim().length === 0) return null;

  const note = typeof candidate.note === "string" ? candidate.note : "";

  const occurrence =
    typeof candidate.occurrence === "number" && Number.isInteger(candidate.occurrence) && candidate.occurrence >= 1
      ? candidate.occurrence
      : 1;

  const needsReplacement = kind === "grammar" || kind === "style";
  const replacement = candidate.replacement;
  if (needsReplacement && (typeof replacement !== "string" || replacement.length === 0)) {
    return null;
  }

  return {
    kind: kind as SuggestionKind,
    quote,
    occurrence,
    note,
    ...(needsReplacement ? { replacement: replacement as string } : {}),
  };
}
