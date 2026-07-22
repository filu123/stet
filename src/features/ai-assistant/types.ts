import type { SuggestionKind } from "@/types/ai";

export type {
  AnnotationSuggestion,
  ReplacementSuggestion,
  Suggestion,
  SuggestionKind,
} from "@/types/ai";

/** A suggestion as parsed from model output — before position resolution. */
export interface RawSuggestion {
  kind: SuggestionKind;
  quote: string;
  occurrence: number;
  note: string;
  replacement?: string;
}
