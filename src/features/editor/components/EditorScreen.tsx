"use client";

import { DocumentCard } from "@/components/ui/DocumentCard";
import { Toast } from "@/components/ui/Toast";
import { AiAssistantButton, SuggestionPopover, useProactiveReview } from "@/features/ai-assistant";
import { DocumentTitleInput } from "@/features/documents";
import type { EditorDocument } from "@/types/document";

import { DocumentEditor } from "./DocumentEditor";
import { EditorToolbar } from "./EditorToolbar";
import { useAutosaveDocument } from "../hooks/useAutosaveDocument";
import { useDocumentEditor } from "../hooks/useDocumentEditor";
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
  useProactiveReview(editor);
  const isSaveToastVisible = useSaveShortcutToast();

  return (
    <>
      {editor && (
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-y border-border-subtle bg-surface-card px-4 py-1 sm:-mx-8 sm:px-8">
          <div className="mx-auto w-full max-w-document">
            <EditorToolbar editor={editor} />
          </div>
        </div>
      )}

      <DocumentCard>
        <DocumentTitleInput documentId={document.id} initialTitle={document.title} />
        <hr className="mt-5 mb-7 border-border-subtle" />
        <DocumentEditor editor={editor} />
      </DocumentCard>

      {editor && (
        <>
          <AiAssistantButton editor={editor} />
          <SuggestionPopover editor={editor} />
        </>
      )}

      <Toast message="Saved automatically ✓" isVisible={isSaveToastVisible} />
    </>
  );
}
