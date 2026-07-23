"use client";

import { useEffect, useState } from "react";

import { Loader2, PenLine, X } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { useAiReviewStore } from "@/stores/ai-review-store";
import { useSettingsStore } from "@/stores/settings-store";
import { readApiKey } from "@/features/settings";
import { cn } from "@/lib/utils/cn";

import { addAiMarkup, clearAiMarkup, showAiMarkup } from "../lib/ai-markup-extension";
import { buildDocumentTextIndex, resolveQuoteRange } from "../lib/position-mapper";
import { requestDocumentReview } from "../lib/review-service";
import { requestContinuation } from "../lib/rewrite-service";
import { AiActionMenu } from "./AiActionMenu";
import { StetMascot } from "./StetMascot";

interface AiAssistantButtonProps {
  editor: Editor;
  /** Shift left so the button clears the notes panel when it's open. */
  isNotesPanelOpen?: boolean;
}

/** The floating AI icon: click to review the document and mark it up. */
export function AiAssistantButton({ editor, isNotesPanelOpen = false }: AiAssistantButtonProps) {
  const { phase, errorMessage, suggestions, isProactiveChecking } = useAiReviewStore();
  const clearReview = useAiReviewStore((state) => state.clearReview);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fresh document (component remounts per doc) → no stale review state.
  useEffect(() => {
    useAiReviewStore.getState().clearReview();
  }, []);

  const handleReviewClick = async () => {
    if (phase === "reviewing") return;
    const store = useAiReviewStore.getState();
    const settings = useSettingsStore.getState();

    const apiKey = readApiKey(settings.provider);
    if (!apiKey) {
      store.failReview("Add your API key first — open AI settings (gear icon, top right).");
      return;
    }

    store.startReview();
    clearAiMarkup(editor);
    try {
      const suggestions = await requestDocumentReview(editor.state.doc, settings, apiKey);
      store.completeReview(suggestions);
      showAiMarkup(editor, suggestions);
      if (suggestions.length === 0) {
        store.failReview("No issues found — this document looks clean. ✓");
      }
    } catch (error) {
      store.failReview(error instanceof Error ? error.message : "The review failed — try again.");
    }
  };

  const handleClearMarkup = () => {
    clearAiMarkup(editor);
    clearReview();
  };

  const handleContinueClick = async () => {
    if (isContinuing || phase === "reviewing") return;
    const store = useAiReviewStore.getState();
    const settings = useSettingsStore.getState();

    const apiKey = readApiKey(settings.provider);
    if (!apiKey) {
      store.failReview("Add your API key first — open AI settings (gear icon, top right).");
      return;
    }

    setIsContinuing(true);
    try {
      const documentText = buildDocumentTextIndex(editor.state.doc).text;
      const continuation = await requestContinuation(documentText, settings, apiKey);
      if (!continuation) return;

      const needsLeadingSpace = documentText.length > 0 && !/\s$/.test(documentText);
      editor
        .chain()
        .focus("end")
        .insertContent(needsLeadingSpace ? ` ${continuation}` : continuation)
        .run();

      // Highlight the inserted text so it's obvious what the AI added.
      const newIndex = buildDocumentTextIndex(editor.state.doc);
      const range = resolveQuoteRange(newIndex, continuation, Number.MAX_SAFE_INTEGER);
      if (range) {
        const suggestion = {
          id: crypto.randomUUID(),
          kind: "highlight" as const,
          quote: continuation,
          occurrence: 1,
          note: "AI continuation — Dismiss to clear the highlight, or ⌘Z to remove the text.",
          from: range.from,
          to: range.to,
        };
        store.addSuggestion(suggestion);
        addAiMarkup(editor, suggestion);
      }
    } catch (error) {
      store.failReview(
        error instanceof Error ? error.message : "Couldn't continue writing — try again.",
      );
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <div
      className={cn(
        "print-hidden fixed right-6 bottom-6 z-40 flex items-center gap-2 transition-transform duration-300",
        isNotesPanelOpen && "md:-translate-x-80",
      )}
    >
      {phase === "error" && errorMessage && (
        <button
          type="button"
          onClick={clearReview}
          className="max-w-xs rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-left text-xs text-content-secondary"
        >
          {errorMessage}
        </button>
      )}

      {isProactiveChecking && (
        <span
          role="status"
          className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-card px-2.5 py-1 text-xs text-content-tertiary"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
          Checking…
        </span>
      )}

      {suggestions.length > 0 && (
        <button
          type="button"
          onClick={handleClearMarkup}
          title="Clear AI markup"
          className="flex items-center gap-1 rounded-full border border-border-subtle bg-surface-card px-2.5 py-1 text-xs text-content-secondary transition-colors hover:bg-surface-hover"
        >
          <X className="size-3" aria-hidden />
          {suggestions.length}
        </button>
      )}

      <button
        type="button"
        aria-label="Continue writing with AI"
        title="Continue writing with AI"
        onClick={() => void handleContinueClick()}
        disabled={isContinuing || phase === "reviewing"}
        className={cn(
          "flex size-10 items-center justify-center rounded-full border border-border-subtle",
          "bg-surface-card text-content-secondary transition-transform",
          "hover:scale-105 hover:text-content-primary active:scale-95",
          isContinuing && "opacity-70",
        )}
      >
        {isContinuing ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <PenLine className="size-4" aria-hidden />
        )}
      </button>

      <div className="relative">
        <button
          type="button"
          aria-label="AI assistant"
          title="AI assistant"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
          disabled={phase === "reviewing"}
          className={cn(
            "flex size-12 items-center justify-center rounded-full bg-accent text-white",
            "transition-transform hover:scale-105 active:scale-95",
            phase === "reviewing" && "opacity-70",
          )}
        >
          {phase === "reviewing" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <StetMascot className="size-7" />
          )}
        </button>

        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-30" aria-hidden onClick={() => setIsMenuOpen(false)} />
            <AiActionMenu
              editor={editor}
              onAnalyze={() => void handleReviewClick()}
              onClose={() => setIsMenuOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}
