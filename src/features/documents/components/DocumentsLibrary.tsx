"use client";

import { useState } from "react";

import { FileText, Plus } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { EditorDocument } from "@/types/document";

import { useDocumentActions } from "../hooks/useDocumentActions";
import { useDocumentLibrary } from "../hooks/useDocumentLibrary";
import { DocumentPreviewCard } from "./DocumentPreviewCard";

const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** The `/documents` screen: every document as a Craft-style card grid. */
export function DocumentsLibrary() {
  const { documents } = useDocumentLibrary();
  const { createAndOpenDocument, deleteDocumentAndNavigate } = useDocumentActions();
  const [documentPendingDelete, setDocumentPendingDelete] = useState<EditorDocument | null>(null);

  const handleConfirmDelete = () => {
    if (!documentPendingDelete) return;
    void deleteDocumentAndNavigate(documentPendingDelete.id);
    setDocumentPendingDelete(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Documents</h1>
          <p className="mt-1 text-sm text-content-tertiary">
            {documents === undefined
              ? "Loading…"
              : `${documents.length} ${documents.length === 1 ? "document" : "documents"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void createAndOpenDocument()}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          New document
        </button>
      </header>

      {documents !== undefined && documents.length === 0 ? (
        <EmptyState onCreate={() => void createAndOpenDocument()} />
      ) : (
        <div className={GRID_CLASS}>
          {documents?.map((document) => (
            <DocumentPreviewCard
              key={document.id}
              document={document}
              onRequestDelete={setDocumentPendingDelete}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={documentPendingDelete !== null}
        title={`Delete "${documentPendingDelete?.title}"?`}
        message="This document will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocumentPendingDelete(null)}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-border-subtle bg-surface-card py-20 text-center">
      <FileText className="size-7 text-content-tertiary" aria-hidden />
      <div>
        <p className="text-sm font-medium text-content-primary">No documents yet</p>
        <p className="mt-1 text-sm text-content-tertiary">
          Create your first document to start writing.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="mt-1 flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" aria-hidden />
        New document
      </button>
    </div>
  );
}
