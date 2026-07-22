"use client";

import { useEffect, useRef, useState } from "react";

import { useLiveQuery } from "dexie-react-hooks";
import { FileText, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { EditorDocument } from "@/types/document";

import { useActiveDocumentId } from "../hooks/useActiveDocumentId";
import { useDocumentActions } from "../hooks/useDocumentActions";
import { listDocumentsByRecency } from "../lib/document-repository";

/**
 * Sidebar body: New-document button, search filter (⌘K), and the
 * recency-ordered document list with per-row actions.
 */
export function SidebarDocumentList() {
  const documents = useLiveQuery(listDocumentsByRecency, []);
  const activeDocumentId = useActiveDocumentId();
  const { createAndOpenDocument, deleteDocumentAndNavigate } = useDocumentActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);
  const [documentPendingDelete, setDocumentPendingDelete] = useState<EditorDocument | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the search field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredDocuments = documents?.filter((document) =>
    document.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const handleConfirmDelete = () => {
    if (!documentPendingDelete) return;
    void deleteDocumentAndNavigate(documentPendingDelete.id);
    setDocumentPendingDelete(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-4">
      <button
        type="button"
        onClick={() => void createAndOpenDocument()}
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" aria-hidden />
        New document
      </button>

      <div className="relative mt-3 shrink-0">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-content-tertiary"
          aria-hidden
        />
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents…"
          aria-label="Search documents"
          className="h-9 w-full rounded-lg border border-border-subtle bg-surface-app pr-12 pl-8 text-sm placeholder:text-content-tertiary focus:border-accent focus:outline-none"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border-subtle px-1 py-0.5 text-[10px] text-content-tertiary">
          ⌘K
        </kbd>
      </div>

      <div className="mt-5 flex shrink-0 items-center justify-between pl-2">
        <p className="text-[11px] font-semibold tracking-wider text-content-tertiary uppercase">
          Documents
        </p>
        <button
          type="button"
          aria-label="New document"
          onClick={() => void createAndOpenDocument()}
          className="flex size-6 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>

      <nav className="mt-2 min-h-0 flex-1 overflow-y-auto" aria-label="Documents">
        {filteredDocuments !== undefined && filteredDocuments.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-content-tertiary">
            {searchQuery ? "No documents match" : "No documents yet"}
          </p>
        )}

        <ul className="flex flex-col gap-1">
          {filteredDocuments?.map((document) => {
            const isActive = document.id === activeDocumentId;
            return (
              <li key={document.id} className="group relative">
                <Link
                  href={`/document/${document.id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl p-2 pr-9 transition-colors",
                    isActive ? "bg-accent-soft" : "hover:bg-surface-hover",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle",
                      isActive ? "bg-surface-card text-accent" : "bg-surface-app text-content-tertiary",
                    )}
                  >
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        isActive ? "font-semibold text-content-primary" : "font-medium text-content-secondary",
                      )}
                    >
                      {document.title}
                    </span>
                    <span className="block truncate text-xs text-content-tertiary">
                      {formatRelativeTime(document.updatedAt)}
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  aria-label={`Options for "${document.title}"`}
                  onClick={() =>
                    setMenuOpenForId((current) => (current === document.id ? null : document.id))
                  }
                  className={cn(
                    "absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md",
                    "text-content-tertiary transition-opacity hover:bg-surface-hover hover:text-content-primary",
                    menuOpenForId === document.id
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                  )}
                >
                  <MoreHorizontal className="size-3.5" aria-hidden />
                </button>

                {menuOpenForId === document.id && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      aria-hidden
                      onClick={() => setMenuOpenForId(null)}
                    />
                    <div className="absolute top-full right-2 z-40 mt-1 w-36 rounded-xl border border-border-subtle bg-surface-card p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpenForId(null);
                          setDocumentPendingDelete(document);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-danger transition-colors hover:bg-surface-hover"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

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
