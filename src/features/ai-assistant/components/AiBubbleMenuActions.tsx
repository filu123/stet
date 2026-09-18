"use client";

import { useState } from "react";

import { Loader2, MessageCircleQuestion, Replace, Send, Sparkles, X } from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { ToolbarDivider } from "@/components/ui/ToolbarDivider";
import { readApiKey } from "@/features/settings";
import { cn } from "@/lib/utils/cn";
import { randomId } from "@/lib/utils/random-id";
import { useAiReviewStore } from "@/stores/ai-review-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Suggestion } from "@/types/ai";

import { askAboutDocument } from "../lib/ask-service";
import { addAiMarkup } from "../lib/ai-markup-extension";
import { buildDocumentTextIndex } from "../lib/position-mapper";
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

interface SelectionAskTarget {
  from: number;
  to: number;
  text: string;
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
  const [selectionAskTarget, setSelectionAskTarget] = useState<SelectionAskTarget | null>(null);
  const [selectionQuestion, setSelectionQuestion] = useState("");
  const [selectionAnswer, setSelectionAnswer] = useState<string | null>(null);
  const [isAskingSelection, setIsAskingSelection] = useState(false);

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
      setSelectionAskTarget(null);
      setSelectionAnswer(null);
    }
  }

  const isBusy = pendingAction !== null || isFetchingSynonyms || isAskingSelection;

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
        id: randomId(),
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

  const openSelectionAsk = () => {
    if (isBusy) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, "\n").trim();
    if (!text) return;
    setSelectionAskTarget({ from, to, text });
    setSelectionQuestion("");
    setSelectionAnswer(null);
    setSynonymTarget(null);
    setIsExpanded(false);
  };

  const askAboutSelection = async () => {
    if (!selectionAskTarget || !selectionQuestion.trim() || isAskingSelection) return;
    const apiKey = readApiKeyOrFail();
    if (!apiKey) return;

    const { from, to, text } = selectionAskTarget;
    if (editor.state.doc.textBetween(from, to, "\n").trim() !== text) {
      useAiReviewStore
        .getState()
        .failReview("The selected text changed — select the idea again and ask your question.");
      setSelectionAskTarget(null);
      return;
    }

    setIsAskingSelection(true);
    setSelectionAnswer(null);
    try {
      const documentText = buildDocumentTextIndex(editor.state.doc).text;
      const response = await askAboutDocument(
        documentText,
        selectionQuestion.trim(),
        useSettingsStore.getState(),
        apiKey,
        [],
        text,
      );
      setSelectionAnswer(response);
      setSelectionQuestion("");
    } catch (error) {
      setSelectionAnswer(error instanceof Error ? error.message : "That didn't work — try again.");
    } finally {
      setIsAskingSelection(false);
    }
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
            <ActionChip
              label="Ask"
              icon={<MessageCircleQuestion className="size-3" aria-hidden />}
              loading={isAskingSelection}
              dimmed={isBusy && !isAskingSelection}
              onClick={openSelectionAsk}
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

        {selectionAskTarget && (
          <div className="dialog-pop absolute top-full right-0 z-40 mt-2 flex w-80 flex-col gap-2 rounded-xl border border-border-subtle bg-surface-card p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-xs font-medium text-content-tertiary">Ask about this idea</span>
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-content-secondary">
                  “{selectionAskTarget.text}”
                </p>
              </div>
              <button
                type="button"
                aria-label="Close selected text question"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSelectionAskTarget(null)}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                "Explain this simply",
                "Give me an example",
                "What are the assumptions?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSelectionQuestion(prompt)}
                  className="rounded-full border border-border-subtle px-2 py-1 text-[11px] text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-1.5">
              <textarea
                value={selectionQuestion}
                onChange={(e) => setSelectionQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void askAboutSelection();
                  }
                }}
                placeholder="What do you want to know?"
                rows={2}
                className="min-w-0 flex-1 resize-none rounded-lg border border-border-subtle bg-surface-app px-2.5 py-2 text-sm placeholder:text-content-tertiary focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                aria-label="Ask AI about selected text"
                disabled={isAskingSelection || selectionQuestion.trim().length === 0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void askAboutSelection()}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isAskingSelection ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-3.5" aria-hidden />
                )}
              </button>
            </div>
            {selectionAnswer && (
              <p className="max-h-48 overflow-y-auto rounded-lg bg-surface-callout px-2.5 py-2 text-sm leading-5 whitespace-pre-wrap">
                {selectionAnswer}
              </p>
            )}
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
