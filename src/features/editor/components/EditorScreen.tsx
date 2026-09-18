"use client";

import { useEffect, type CSSProperties, type MouseEvent } from "react";

import { FocusModeExitButton } from "@/components/layout/FocusModeExit";
import { DocumentCard } from "@/components/ui/DocumentCard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Toast } from "@/components/ui/Toast";
import { AiAssistantButton, SuggestionPopover, useProactiveReview } from "@/features/ai-assistant";
import { DocumentTitleInput } from "@/features/documents";
import { NotesPanel, NotesToggleButton, useDocumentNotes } from "@/features/notes";
import { useNotesUiStore } from "@/stores/notes-ui-store";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import type { EditorDocument } from "@/types/document";

import { BookModeBar } from "./BookModeBar";
import { BookPageTurnZones } from "./BookPageTurnZones";
import { DocumentEditor } from "./DocumentEditor";
import { EditorToolbar } from "./EditorToolbar";
import { PageResizeHandles } from "./PageResizeHandles";
import { PenMarkupPalette } from "./PenMarkupPalette";
import { WordCountPill } from "./WordCountPill";
import { useAutosaveDocument } from "../hooks/useAutosaveDocument";
import { useBookMode } from "../hooks/useBookMode";
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
 *
 * Book mode reuses this exact tree — same editor instance, same card, same
 * markup tools — and only changes how it is framed: the chrome steps aside and
 * the content is clipped to one screen-sized sheet at a time (`useBookMode`).
 */
export function EditorScreen({ document }: EditorScreenProps) {
  const editor = useDocumentEditor(document.content);
  useAutosaveDocument(editor, document.id);
  useImageDropPaste(editor);
  useProactiveReview(editor);
  const isSaveToastVisible = useSaveShortcutToast();
  const { pageWidth, freeWidth, pageLayout, paperSize, fontSize, fontFamily } =
    useUiPreferencesStore();
  const {
    isBookMode,
    pageIndex,
    pageCount,
    attachBody,
    attachViewport,
    attachGhostLayer,
    viewportStyle,
    pagesStyle,
    turnPage,
    goToPage,
    stageProps,
  } = useBookMode(editor);

  const notes = useDocumentNotes(editor);
  const { isPanelOpen, togglePanel, openPanel, focusNote, resetForDocument } = useNotesUiStore();

  // A new document starts with no draft/focused note (panel preference persists).
  useEffect(() => {
    resetForDocument();
  }, [document.id, resetForDocument]);

  // The page-width preference sets the text column; the sheet itself is the
  // whole screen. `max-w-document` and `max-w-5xl` are its printed equivalents.
  const bookMeasure =
    pageWidth === "free" ? `${freeWidth}px` : pageWidth === "wide" ? "64rem" : "45rem";

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
      {/* Outside book mode the wrappers are `display: contents` — the page
          keeps exactly the layout it always had. */}
      <div
        className={isBookMode ? "book-stage" : "contents"}
        // The sheet is full-bleed in book mode, so the reading measure is what
        // the page-width preference controls there.
        style={isBookMode ? ({ "--book-measure": bookMeasure } as CSSProperties) : undefined}
        {...(isBookMode ? stageProps : {})}
      >
        {editor && !isBookMode && (
          <div className="editor-toolbar-card sticky top-0 z-10 mb-5 flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <EditorToolbar editor={editor} />
            </div>
            <NotesToggleButton count={notes.length} isOpen={isPanelOpen} onClick={togglePanel} />
            <FocusModeExitButton />
          </div>
        )}

        <div className={isBookMode ? "book-page-area" : "contents"}>
          <DocumentCard
            width={pageWidth}
            freeWidth={freeWidth}
            layout={isBookMode ? "pages" : pageLayout}
            paper={paperSize}
            fontSize={fontSize}
            fontFamily={fontFamily}
          >
            {pageWidth === "free" && !isBookMode && <PageResizeHandles />}
            {!isBookMode && (
              <>
                <DocumentTitleInput documentId={document.id} initialTitle={document.title} />
                <hr className="mt-6 mb-8 border-border-subtle print-hidden" />
              </>
            )}
            <div className="editor-body flex-1" ref={attachBody} onClick={handleEditorClick}>
              <div ref={attachViewport} style={viewportStyle} className="book-viewport">
                <div style={pagesStyle} className="book-pages">
                  <DocumentEditor editor={editor} />
                </div>
              </div>
            </div>
            {editor && !isBookMode && <WordCountPill editor={editor} />}
          </DocumentCard>

          {isBookMode && (
            <>
              {/* React owns nothing inside this layer — the turning copy of
                  the outgoing page is mounted into it imperatively. */}
              <div className="book-ghost-layer" ref={attachGhostLayer} aria-hidden />
              <BookPageTurnZones pageIndex={pageIndex} pageCount={pageCount} onTurn={turnPage} />
            </>
          )}
        </div>

        {isBookMode && (
          <BookModeBar
            pageIndex={pageIndex}
            pageCount={pageCount}
            onTurn={turnPage}
            onGoToPage={goToPage}
          />
        )}
      </div>

      {editor && (
        // An AI crash must never take the editor down with it.
        <ErrorBoundary fallback={() => null}>
          <NotesPanel editor={editor} notes={notes} />
          <AiAssistantButton editor={editor} isNotesPanelOpen={isPanelOpen} />
          <SuggestionPopover editor={editor} />
        </ErrorBoundary>
      )}

      <PenMarkupPalette />

      <Toast message="Saved automatically ✓" isVisible={isSaveToastVisible} />
    </>
  );
}
