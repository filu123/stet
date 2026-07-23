"use client";

import { useEffect, type MouseEvent } from "react";

import { DocumentCard } from "@/components/ui/DocumentCard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Toast } from "@/components/ui/Toast";
import { AiAssistantButton, SuggestionPopover, useProactiveReview } from "@/features/ai-assistant";
import { DocumentTitleInput } from "@/features/documents";
import { NotesPanel, NotesToggleButton, useDocumentNotes } from "@/features/notes";
import { useNotesUiStore } from "@/stores/notes-ui-store";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import type { EditorDocument } from "@/types/document";

import { DocumentEditor } from "./DocumentEditor";
import { EditorToolbar } from "./EditorToolbar";
import { PageResizeHandles } from "./PageResizeHandles";
import { WordCountPill } from "./WordCountPill";
import {
  PAGE_GAP_HEIGHT,
  PAPER_CONTENT_HEIGHTS,
  setPageView,
} from "../extensions/page-view";
import { useAutosaveDocument } from "../hooks/useAutosaveDocument";
import { useDocumentEditor } from "../hooks/useDocumentEditor";
import { useImageDropPaste } from "../hooks/useImageDropPaste";
import { useSaveShortcutToast } from "../hooks/useSaveShortcutToast";

interface EditorScreenProps {
  /** Remount with a `key` when switching documents — content is initial-only. */
  document: EditorDocument;
}

/**
 * The full editing surface for one document: fixed docx-style toolbar
 * (sticky, full-bleed) above the floating document card.
 */
export function EditorScreen({ document }: EditorScreenProps) {
  const editor = useDocumentEditor(document.content);
  useAutosaveDocument(editor, document.id);
  useImageDropPaste(editor);
  useProactiveReview(editor);
  const isSaveToastVisible = useSaveShortcutToast();
  const { pageWidth, freeWidth, pageLayout, paperSize, fontSize, fontFamily } =
    useUiPreferencesStore();

  const notes = useDocumentNotes(editor);
  const { isPanelOpen, togglePanel, openPanel, focusNote, resetForDocument } = useNotesUiStore();

  // Page view follows the page-setup preferences.
  useEffect(() => {
    if (!editor) return;
    setPageView(
      editor,
      pageLayout === "pages"
        ? { pageHeight: PAPER_CONTENT_HEIGHTS[paperSize], gapHeight: PAGE_GAP_HEIGHT }
        : null,
    );
  }, [editor, pageLayout, paperSize]);

  // A new document starts with no draft/focused note (panel preference persists).
  useEffect(() => {
    resetForDocument();
  }, [document.id, resetForDocument]);

  // Clicking a note's highlighted text opens the panel on that note.
  const handleEditorClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("[data-note-id]");
    const noteId = anchor?.getAttribute("data-note-id");
    if (!noteId) return;
    openPanel();
    focusNote(noteId);
  };

  return (
    <>
      {editor && (
        <div className="editor-toolbar-card sticky top-0 z-10 mb-5 flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <EditorToolbar editor={editor} />
          </div>
          <NotesToggleButton count={notes.length} isOpen={isPanelOpen} onClick={togglePanel} />
        </div>
      )}

      <DocumentCard
        width={pageWidth}
        freeWidth={freeWidth}
        layout={pageLayout}
        paper={paperSize}
        fontSize={fontSize}
        fontFamily={fontFamily}
      >
        {pageWidth === "free" && <PageResizeHandles />}
        <DocumentTitleInput documentId={document.id} initialTitle={document.title} />
        <hr className="mt-6 mb-8 border-border-subtle print-hidden" />
        <div className="editor-body flex-1" onClick={handleEditorClick}>
          <DocumentEditor editor={editor} />
        </div>
        {editor && <WordCountPill editor={editor} />}
      </DocumentCard>

      {editor && (
        // An AI crash must never take the editor down with it.
        <ErrorBoundary fallback={() => null}>
          <NotesPanel editor={editor} notes={notes} />
          <AiAssistantButton editor={editor} isNotesPanelOpen={isPanelOpen} />
          <SuggestionPopover editor={editor} />
        </ErrorBoundary>
      )}

      <Toast message="Saved automatically ✓" isVisible={isSaveToastVisible} />
    </>
  );
}
