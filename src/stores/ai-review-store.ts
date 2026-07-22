import { create } from "zustand";

import type { Suggestion } from "@/types/ai";

/**
 * AI review state, shared between the AI button (triggers reviews), the
 * markup plugin (click → active suggestion), and the popover (accept/dismiss).
 *
 * Holds suggestion CONTENT only — live document positions belong to the
 * ai-markup plugin, which remaps them through every transaction.
 */
type ReviewPhase = "idle" | "reviewing" | "error";

interface AiReviewState {
  phase: ReviewPhase;
  errorMessage: string | null;
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  /** True while a background (proactive) check is in flight — separate from `phase`. */
  isProactiveChecking: boolean;
  setProactiveChecking: (isChecking: boolean) => void;
  startReview: () => void;
  completeReview: (suggestions: Suggestion[]) => void;
  failReview: (message: string) => void;
  addSuggestion: (suggestion: Suggestion) => void;
  removeSuggestion: (suggestionId: string) => void;
  setActiveSuggestion: (suggestionId: string | null) => void;
  clearReview: () => void;
}

export const useAiReviewStore = create<AiReviewState>((set) => ({
  phase: "idle",
  errorMessage: null,
  suggestions: [],
  activeSuggestionId: null,
  isProactiveChecking: false,
  setProactiveChecking: (isChecking) => set({ isProactiveChecking: isChecking }),

  startReview: () => set({ phase: "reviewing", errorMessage: null, activeSuggestionId: null }),
  completeReview: (suggestions) => set({ phase: "idle", suggestions }),
  failReview: (message) => set({ phase: "error", errorMessage: message }),
  addSuggestion: (suggestion) =>
    set((state) => ({ suggestions: [...state.suggestions, suggestion] })),
  removeSuggestion: (suggestionId) =>
    set((state) => ({
      suggestions: state.suggestions.filter((s) => s.id !== suggestionId),
      activeSuggestionId:
        state.activeSuggestionId === suggestionId ? null : state.activeSuggestionId,
    })),
  setActiveSuggestion: (suggestionId) => set({ activeSuggestionId: suggestionId }),
  clearReview: () =>
    set({
      phase: "idle",
      errorMessage: null,
      suggestions: [],
      activeSuggestionId: null,
      isProactiveChecking: false,
    }),
}));
