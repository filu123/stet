"use client";

import { DocumentCard } from "@/components/ui/DocumentCard";
import { Toast } from "@/components/ui/Toast";
import { AiAssistantButton, SuggestionPopover, useProactiveReview } from "@/features/ai-assistant";
import { DocumentTitleInput } from "@/features/documents";
import type { EditorDocument } from "@/types/document";

import { DocumentEditor } from "./DocumentEditor";
import { EditorToolbar } from "./EditorToolbar";
import { WordCountPill } from "./WordCountPill";
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
        <div className="sticky top-0 z-10 mb-5 rounded-xl border border-border-subtle bg-surface-card px-2 py-1.5">
          <EditorToolbar editor={editor} />
        </div>
      )}

      <DocumentCard>
        <DocumentTitleInput documentId={document.id} initialTitle={document.title} />
        <hr className="mt-6 mb-8 border-border-subtle" />
        <div className="flex-1">
          <DocumentEditor editor={editor} />
        </div>
        {editor && <WordCountPill editor={editor} />}
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
