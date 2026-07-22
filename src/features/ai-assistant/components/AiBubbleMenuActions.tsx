"use client";

import { useState } from "react";

import { Loader2, Sparkles } from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { ToolbarDivider } from "@/components/ui/ToolbarDivider";
import { readApiKey } from "@/features/settings";
import { cn } from "@/lib/utils/cn";
import { useAiReviewStore } from "@/stores/ai-review-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Suggestion } from "@/types/ai";

import { addAiMarkup } from "../lib/ai-markup-extension";
import { ACTION_NOTES, requestRewrite, type RewriteAction } from "../lib/rewrite-service";

interface AiBubbleMenuActionsProps {
  editor: Editor;
}

const ACTIONS: readonly { action: RewriteAction; label: string }[] = [
  { action: "improve", label: "Improve" },
  { action: "shorten", label: "Shorten" },
  { action: "expand", label: "Expand" },
  { action: "fix", label: "Fix" },
];

/**
 * AI rewrite actions inside the formatting bubble menu.
 * The result is never applied silently — it becomes a suggestion the user
 * accepts or dismisses via the same popover as document reviews.
 */
export function AiBubbleMenuActions({ editor }: AiBubbleMenuActionsProps) {
  const [pendingAction, setPendingAction] = useState<RewriteAction | null>(null);

  const hasSelection = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => !editorInstance.state.selection.empty,
  });

  const handleAction = async (action: RewriteAction) => {
    if (pendingAction) return;
    const store = useAiReviewStore.getState();
    const settings = useSettingsStore.getState();

    const apiKey = readApiKey(settings.provider);
    if (!apiKey) {
      store.failReview("Add your API key first — open AI settings (gear icon, top right).");
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    if (selectedText.trim().length === 0) return;

    setPendingAction(action);
    try {
      const replacement = await requestRewrite(selectedText, action, settings, apiKey);

      // The user may have edited while we waited — never mark stale positions.
      if (editor.state.doc.textBetween(from, to, "\n") !== selectedText) {
        store.failReview("The text changed while rewriting — select it and try again.");
        return;
      }

      const suggestion: Suggestion = {
        id: crypto.randomUUID(),
        kind: action === "fix" ? "grammar" : "style",
        quote: selectedText,
        occurrence: 1,
        note: ACTION_NOTES[action],
        from,
        to,
        replacement,
      };
      store.addSuggestion(suggestion);
      addAiMarkup(editor, suggestion);
      store.setActiveSuggestion(suggestion.id);
    } catch (error) {
      store.failReview(error instanceof Error ? error.message : "The rewrite failed — try again.");
    } finally {
      setPendingAction(null);
    }
  };

  if (!hasSelection) return null;

  return (
    <>
      <ToolbarDivider />
      <Sparkles className="size-3 shrink-0 text-accent" aria-hidden />
      {ACTIONS.map(({ action, label }) => (
        <button
          key={action}
          type="button"
          disabled={pendingAction !== null}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void handleAction(action)}
          className={cn(
            "flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs whitespace-nowrap transition-colors",
            "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
            pendingAction !== null && pendingAction !== action && "opacity-40",
          )}
        >
          {pendingAction === action && <Loader2 className="size-3 animate-spin" aria-hidden />}
          {label}
        </button>
      ))}
    </>
  );
}
