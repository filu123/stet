"use client";

import { useState } from "react";

import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";
import type { EditorDocument } from "@/types/document";

import { useActiveDocumentId } from "../hooks/useActiveDocumentId";
import { useDocumentActions } from "../hooks/useDocumentActions";
import { listDocumentsByRecency } from "../lib/document-repository";

/** Recency-ordered document list for the sidebar, with create and delete. */
export function SidebarDocumentList() {
  const documents = useLiveQuery(listDocumentsByRecency, []);
  const activeDocumentId = useActiveDocumentId();
  const { createAndOpenDocument, deleteDocumentAndNavigate } = useDocumentActions();
  const [documentPendingDelete, setDocumentPendingDelete] = useState<EditorDocument | null>(null);

  const handleConfirmDelete = () => {
    if (!documentPendingDelete) return;
    void deleteDocumentAndNavigate(documentPendingDelete.id);
    setDocumentPendingDelete(null);
  };

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Documents">
      <div className="flex items-center justify-between pb-1 pl-2">
        <p className="text-xs font-medium text-content-tertiary">Documents</p>
        <IconButton
          aria-label="New document"
          className="size-6"
          onClick={() => void createAndOpenDocument()}
        >
          <Plus className="size-3.5" aria-hidden />
        </IconButton>
      </div>

      {documents !== undefined && documents.length === 0 && (
        <p className="px-2 py-1.5 text-sm text-content-tertiary">No documents yet</p>
      )}

      <ul>
        {documents?.map((document) => {
          const isActive = document.id === activeDocumentId;
          return (
            <li key={document.id} className="group relative">
              <Link
                href={`/document/${document.id}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg py-1.5 pr-8 pl-2 text-sm",
                  "transition-colors hover:bg-surface-hover",
                  isActive
                    ? "bg-surface-hover font-medium text-content-primary"
                    : "text-content-secondary",
                )}
              >
                <FileText className="size-4 shrink-0 text-content-tertiary" aria-hidden />
                <span className="truncate">{document.title}</span>
              </Link>
              <IconButton
                aria-label={`Delete "${document.title}"`}
                className="absolute top-1/2 right-1 size-6 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => setDocumentPendingDelete(document)}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </IconButton>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        isOpen={documentPendingDelete !== null}
        title={`Delete "${documentPendingDelete?.title}"?`}
        message="This document will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocumentPendingDelete(null)}
      />
    </nav>
  );
}
