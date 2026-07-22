"use client";

import { useEffect } from "react";

import { Check, X } from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { useAiReviewStore } from "@/stores/ai-review-store";
import type { SuggestionKind } from "@/types/ai";

import { findAiMarkupRange, removeAiMarkup } from "../lib/ai-markup-extension";

interface SuggestionPopoverProps {
  editor: Editor;
}

const KIND_LABELS: Record<SuggestionKind, { label: string; dotClass: string }> = {
  grammar: { label: "Grammar", dotClass: "bg-ai-grammar" },
  style: { label: "Style", dotClass: "bg-ai-style" },
  highlight: { label: "Worth noting", dotClass: "bg-pill-yellow" },
  circle: { label: "Double-check", dotClass: "bg-ai-circle" },
};

/** Floating card for the clicked suggestion: note + Accept / Dismiss. */
export function SuggestionPopover({ editor }: SuggestionPopoverProps) {
  const activeSuggestionId = useAiReviewStore((state) => state.activeSuggestionId);
  const suggestion = useAiReviewStore((state) =>
    state.suggestions.find((s) => s.id === state.activeSuggestionId),
  );
  const setActiveSuggestion = useAiReviewStore((state) => state.setActiveSuggestion);
  const removeSuggestion = useAiReviewStore((state) => state.removeSuggestion);

  // Re-render on every editor transaction so the popover follows its text.
  useEditorState({ editor, selector: (context) => context.editor.state });

  // Close on Escape or any scroll (a scrolled-away popover would be misplaced).
  useEffect(() => {
    if (!activeSuggestionId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveSuggestion(null);
    };
    const handleScroll = () => setActiveSuggestion(null);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeSuggestionId, setActiveSuggestion]);

  if (!suggestion) return null;

  const range = findAiMarkupRange(editor, suggestion.id);
  if (!range) {
    // Decoration vanished (e.g. its text was deleted) — nothing to point at.
    return null;
  }

  const coords = editor.view.coordsAtPos(range.from);
  const popoverLeft = Math.min(Math.max(coords.left, 16), window.innerWidth - 336);
  const popoverTop = coords.bottom + 8;

  const handleDismiss = () => {
    removeAiMarkup(editor, suggestion.id);
    removeSuggestion(suggestion.id);
  };

  const handleAccept = () => {
    if (suggestion.kind !== "grammar" && suggestion.kind !== "style") return;
    const currentRange = findAiMarkupRange(editor, suggestion.id);
    if (!currentRange) return;
    editor
      .chain()
      .focus()
      .insertContentAt(currentRange, suggestion.replacement)
      .run();
    removeAiMarkup(editor, suggestion.id);
    removeSuggestion(suggestion.id);
  };

  const kindInfo = KIND_LABELS[suggestion.kind];
  const hasReplacement = suggestion.kind === "grammar" || suggestion.kind === "style";

  return (
    <div
      role="dialog"
      aria-label={`${kindInfo.label} suggestion`}
      style={{ position: "fixed", left: popoverLeft, top: popoverTop }}
      className="dialog-pop z-50 w-80 rounded-xl border border-border-subtle bg-surface-card p-3"
    >
      <div className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${kindInfo.dotClass}`} aria-hidden />
        <span className="text-xs font-medium text-content-secondary">{kindInfo.label}</span>
      </div>

      {suggestion.note && (
        <p className="mt-1.5 text-sm leading-5 text-content-primary">{suggestion.note}</p>
      )}

      {hasReplacement && (
        <p className="mt-2 rounded-lg bg-surface-callout px-2.5 py-1.5 text-sm">
          <span className="text-content-tertiary line-through">{suggestion.quote}</span>
          <span aria-hidden> → </span>
          <span className="font-medium">{suggestion.replacement}</span>
        </p>
      )}

      <div className="mt-2.5 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={handleDismiss}
          className="flex items-center gap-1 rounded-lg border border-border-subtle px-2.5 py-1 text-xs transition-colors hover:bg-surface-hover"
        >
          <X className="size-3" aria-hidden />
          Dismiss
        </button>
        {hasReplacement && (
          <button
            type="button"
            onClick={handleAccept}
            className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-85"
          >
            <Check className="size-3" aria-hidden />
            Accept
          </button>
        )}
      </div>
    </div>
  );
}
