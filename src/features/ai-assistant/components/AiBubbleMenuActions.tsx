"use client";

import { useState } from "react";

import { Loader2, Replace, Sparkles } from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { ToolbarDivider } from "@/components/ui/ToolbarDivider";
import { readApiKey } from "@/features/settings";
import { cn } from "@/lib/utils/cn";
import { useAiReviewStore } from "@/stores/ai-review-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Suggestion } from "@/types/ai";

import { addAiMarkup } from "../lib/ai-markup-extension";
import { ACTION_NOTES, requestRewrite, type RewriteAction } from "../lib/rewrite-service";
import { requestSynonyms } from "../lib/synonym-service";

interface AiBubbleMenuActionsProps {
  editor: Editor;
}

const ACTIONS: readonly { action: RewriteAction; label: string }[] = [
  { action: "improve", label: "Improve" },
  { action: "shorten", label: "Shorten" },
  { action: "expand", label: "Expand" },
  { action: "fix", label: "Fix" },
];

interface SynonymTarget {
  from: number;
  to: number;
  text: string;
  options: string[];
}

const API_KEY_MESSAGE = "Add your API key first — open AI settings (gear icon, top right).";

/**
 * AI rewrite actions inside the formatting bubble menu.
 * Rewrites become a suggestion the user accepts/dismisses; "Synonyms" instead
 * offers a small list of in-context replacements to pick from.
 */
export function AiBubbleMenuActions({ editor }: AiBubbleMenuActionsProps) {
  const [pendingAction, setPendingAction] = useState<RewriteAction | null>(null);
  const [isFetchingSynonyms, setIsFetchingSynonyms] = useState(false);
  const [synonymTarget, setSynonymTarget] = useState<SynonymTarget | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasSelection = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => !editorInstance.state.selection.empty,
  });

  // Collapse and clear results whenever the selection goes away — React's
  // documented "adjust state when props change" render-time pattern.
  const [previousHasSelection, setPreviousHasSelection] = useState(hasSelection);
  if (previousHasSelection !== hasSelection) {
    setPreviousHasSelection(hasSelection);
    if (!hasSelection) {
      setIsExpanded(false);
      setSynonymTarget(null);
    }
  }

  const isBusy = pendingAction !== null || isFetchingSynonyms;

  const readApiKeyOrFail = (): string | null => {
    const settings = useSettingsStore.getState();
    const apiKey = readApiKey(settings.provider);
    if (!apiKey) useAiReviewStore.getState().failReview(API_KEY_MESSAGE);
    return apiKey;
  };

  const handleAction = async (action: RewriteAction) => {
    if (isBusy) return;
    const store = useAiReviewStore.getState();
    const settings = useSettingsStore.getState();

    const apiKey = readApiKeyOrFail();
    if (!apiKey) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    if (selectedText.trim().length === 0) return;

    setPendingAction(action);
    try {
      const replacement = await requestRewrite(selectedText, action, settings, apiKey);

      if (replacement.trim() === selectedText.trim()) {
        store.failReview(
          action === "fix"
            ? "Nothing to fix — this text is already correct. ✓"
            : "No changes suggested — this text looks good as it is. ✓",
        );
        return;
      }

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
      setIsExpanded(false);
    }
  };

  const handleSynonyms = async () => {
    if (isBusy) return;
    const store = useAiReviewStore.getState();
    const settings = useSettingsStore.getState();

    const apiKey = readApiKeyOrFail();
    if (!apiKey) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (selectedText.trim().length === 0) return;
    const context = editor.state.selection.$from.parent.textContent;

    setSynonymTarget(null);
    setIsFetchingSynonyms(true);
    try {
      const options = await requestSynonyms(selectedText, context, settings, apiKey);
      if (options.length === 0) {
        store.failReview("No alternatives found for that word. ✓");
        return;
      }
      setSynonymTarget({ from, to, text: selectedText, options });
      setIsExpanded(false);
    } catch (error) {
      store.failReview(
        error instanceof Error ? error.message : "Couldn't find synonyms — try again.",
      );
    } finally {
      setIsFetchingSynonyms(false);
    }
  };

  const pickSynonym = (word: string) => {
    if (!synonymTarget) return;
    const { from, to, text } = synonymTarget;
    // Never replace a stale range — the user may have edited while it was open.
    if (editor.state.doc.textBetween(from, to, " ") !== text) {
      useAiReviewStore.getState().failReview("The text changed — select the word again.");
      setSynonymTarget(null);
      return;
    }
    editor.chain().focus().insertContentAt({ from, to }, word).run();
    setSynonymTarget(null);
  };

  if (!hasSelection) return null;

  return (
    <>
      <ToolbarDivider />
      <div className="relative flex items-center gap-0.5">
        <ToolbarButton
          label="AI actions"
          isActive={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isBusy ? (
            <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
          ) : (
            <Sparkles className="size-3.5 text-accent" aria-hidden />
          )}
        </ToolbarButton>

        {isExpanded && (
          <>
            {ACTIONS.map(({ action, label }) => (
              <ActionChip
                key={action}
                label={label}
                loading={pendingAction === action}
                dimmed={isBusy && pendingAction !== action}
                onClick={() => void handleAction(action)}
              />
            ))}
            <ActionChip
              label="Synonyms"
              icon={<Replace className="size-3" aria-hidden />}
              loading={isFetchingSynonyms}
              dimmed={isBusy && !isFetchingSynonyms}
              onClick={() => void handleSynonyms()}
            />
          </>
        )}

        {synonymTarget && (
          <div className="dialog-pop absolute top-full right-0 z-40 mt-2 flex w-44 flex-col gap-0.5 rounded-xl border border-border-subtle bg-surface-card p-1.5">
            <span className="line-clamp-1 px-2 pt-0.5 pb-1 text-xs font-medium text-content-tertiary">
              Replace “{synonymTarget.text}” with…
            </span>
            {synonymTarget.options.map((word) => (
              <button
                key={word}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSynonym(word)}
                className="rounded-lg px-2.5 py-1.5 text-left text-sm text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

interface ActionChipProps {
  label: string;
  onClick: () => void;
  loading?: boolean;
  dimmed?: boolean;
  icon?: React.ReactNode;
}

function ActionChip({ label, onClick, loading = false, dimmed = false, icon }: ActionChipProps) {
  return (
    <button
      type="button"
      disabled={dimmed || loading}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs whitespace-nowrap transition-colors",
        "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
        dimmed && "opacity-40",
      )}
    >
      {loading ? <Loader2 className="size-3 animate-spin" aria-hidden /> : icon}
      {label}
    </button>
  );
}
