/** Shared AI types — used by the settings/ai-assistant features and the stores. */

export type AiProvider = "anthropic" | "openai" | "gemini";

export type AiAssistantMode = "on-demand" | "proactive";

/** Non-secret AI settings — persisted via the settings store (never the API key). */
export interface AiSettings {
  provider: AiProvider;
  model: string;
  mode: AiAssistantMode;
}

export type SuggestionKind = "grammar" | "style" | "highlight" | "circle";

interface SuggestionCommon {
  /** Client-generated UUID. */
  id: string;
  quote: string;
  /** 1-based occurrence of `quote` in the document text. */
  occurrence: number;
  /** The AI's explanation, shown to the user. */
  note: string;
  /** ProseMirror positions AT REVIEW TIME — live positions come from the markup plugin. */
  from: number;
  to: number;
}

/** Grammar/style issues carry a drop-in replacement the user can accept. */
export interface ReplacementSuggestion extends SuggestionCommon {
  kind: "grammar" | "style";
  replacement: string;
}

/** Highlights and circles only mark up the text — nothing to apply. */
export interface AnnotationSuggestion extends SuggestionCommon {
  kind: "highlight" | "circle";
}

export type Suggestion = ReplacementSuggestion | AnnotationSuggestion;
