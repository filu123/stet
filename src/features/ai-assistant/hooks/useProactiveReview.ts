"use client";

import { useEffect, useRef } from "react";

import type { Editor } from "@tiptap/react";

import { readApiKey } from "@/features/settings";
import { useAiReviewStore } from "@/stores/ai-review-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Suggestion } from "@/types/ai";

import { addAiMarkup } from "../lib/ai-markup-extension";
import { buildDocumentTextIndex, resolveQuoteRange } from "../lib/position-mapper";
import { collectChangedParagraphs } from "../lib/proactive-review";
import { requestCompletion } from "../lib/provider-client";
import { buildReviewUserPrompt, REVIEW_SYSTEM_PROMPT } from "../lib/review-prompt";
import { parseReviewResponse } from "../lib/suggestion-parser";

/** Idle time after the last keystroke before a background check runs. */
const PROACTIVE_DEBOUNCE_MS = 3000;
/** After a failed background check, stay quiet for a while (no retry storms). */
const FAILURE_BACKOFF_MS = 60_000;

/**
 * Proactive mode: quietly reviews CHANGED paragraphs a few seconds after the
 * user stops typing. Unchanged paragraphs are never re-sent (content-hash
 * cache); toggling the setting off stops all background activity immediately.
 */
export function useProactiveReview(editor: Editor | null): void {
  const mode = useSettingsStore((state) => state.mode);
  const reviewedHashesRef = useRef<Set<string>>(new Set());
  const lastFailureAtRef = useRef(0);

  useEffect(() => {
    if (!editor || mode !== "proactive") return;

    let isCancelled = false;
    let isInFlight = false;
    let debounceTimer: number | null = null;

    const runBackgroundCheck = async () => {
      if (isCancelled || isInFlight) return;
      if (Date.now() - lastFailureAtRef.current < FAILURE_BACKOFF_MS) return;
      if (useAiReviewStore.getState().phase === "reviewing") return; // don't race on-demand reviews

      const settings = useSettingsStore.getState();
      const apiKey = readApiKey(settings.provider);
      if (!apiKey) return; // proactive mode never nags — the review button explains

      const changedParagraphs = collectChangedParagraphs(
        editor.state.doc,
        reviewedHashesRef.current,
      );
      if (changedParagraphs.length === 0) return;

      isInFlight = true;
      const store = useAiReviewStore.getState();
      store.setProactiveChecking(true);
      try {
        const modelOutput = await requestCompletion({
          systemPrompt: REVIEW_SYSTEM_PROMPT,
          userPrompt: buildReviewUserPrompt(
            changedParagraphs.map((paragraph) => paragraph.text).join("\n\n"),
          ),
          settings,
          apiKey,
        });
        if (isCancelled) return;

        const rawSuggestions = parseReviewResponse(modelOutput);
        const textIndex = buildDocumentTextIndex(editor.state.doc);
        const existing = useAiReviewStore.getState().suggestions;

        for (const rawSuggestion of rawSuggestions) {
          const range = resolveQuoteRange(textIndex, rawSuggestion.quote, rawSuggestion.occurrence);
          if (!range) continue;
          const isDuplicate = existing.some(
            (s) => s.from === range.from && s.to === range.to && s.kind === rawSuggestion.kind,
          );
          if (isDuplicate) continue;

          const suggestion = {
            id: crypto.randomUUID(),
            kind: rawSuggestion.kind,
            quote: rawSuggestion.quote,
            occurrence: rawSuggestion.occurrence,
            note: rawSuggestion.note,
            from: range.from,
            to: range.to,
            ...(rawSuggestion.replacement !== undefined
              ? { replacement: rawSuggestion.replacement }
              : {}),
          } as Suggestion;
          useAiReviewStore.getState().addSuggestion(suggestion);
          addAiMarkup(editor, suggestion);
        }

        // Only mark paragraphs reviewed after a successful pass.
        for (const paragraph of changedParagraphs) {
          reviewedHashesRef.current.add(paragraph.hash);
        }
      } catch {
        // Background checks fail silently — back off instead of spamming.
        lastFailureAtRef.current = Date.now();
      } finally {
        isInFlight = false;
        useAiReviewStore.getState().setProactiveChecking(false);
      }
    };

    const handleUpdate = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void runBackgroundCheck();
      }, PROACTIVE_DEBOUNCE_MS);
    };

    editor.on("update", handleUpdate);
    return () => {
      isCancelled = true;
      editor.off("update", handleUpdate);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      useAiReviewStore.getState().setProactiveChecking(false);
    };
  }, [editor, mode]);
}
