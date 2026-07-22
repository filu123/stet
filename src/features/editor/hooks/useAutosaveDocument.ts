"use client";

import { useEffect, useRef } from "react";

import type { Editor } from "@tiptap/react";

import { updateDocumentContent } from "@/features/documents";
import { useSaveStatusStore } from "@/stores/save-status-store";

/** One save per typing pause — rapid keystrokes reset the timer. */
const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Persists editor changes to the document, debounced.
 * A pending save is flushed on unmount so the last keystrokes are never lost.
 */
export function useAutosaveDocument(editor: Editor | null, documentId: string): void {
  const setStatus = useSaveStatusStore((state) => state.setStatus);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editor) return;

    const saveNow = async () => {
      setStatus("saving");
      await updateDocumentContent(documentId, editor.getJSON());
      setStatus("saved");
    };

    const handleUpdate = () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        void saveNow();
      }, AUTOSAVE_DEBOUNCE_MS);
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        void saveNow();
      }
    };
  }, [editor, documentId, setStatus]);
}
