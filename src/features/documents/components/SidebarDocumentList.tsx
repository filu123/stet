"use client";

import { useEffect, useRef, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderInput,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { EditorDocument, FolderSummary } from "@/types/document";

import { useActiveDocumentId } from "../hooks/useActiveDocumentId";
import { useDocumentActions } from "../hooks/useDocumentActions";
import {
  createFolder,
  deleteFolder,
  listDocumentsByRecency,
  listFolders,
  moveDocumentToFolder,
} from "../lib/document-repository";
import { subscribeToDocumentChanges } from "../lib/storage-backend";

/**
 * Sidebar body: New-document button, search (⌘K), unfiled DOCUMENTS,
 * and FOLDERS (expandable, with per-document move actions).
 */
export function SidebarDocumentList() {
  const [documents, setDocuments] = useState<EditorDocument[] | undefined>(undefined);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<ReadonlySet<string>>(new Set());
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [documentPendingDelete, setDocumentPendingDelete] = useState<EditorDocument | null>(null);
  const [folderPendingDelete, setFolderPendingDelete] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { createAndOpenDocument, deleteDocumentAndNavigate } = useDocumentActions();

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      const [loadedDocuments, loadedFolders] = await Promise.all([
        listDocumentsByRecency(),
        listFolders(),
      ]);
      if (isCancelled) return;
      setDocuments(loadedDocuments);
      setFolders(loadedFolders);
    };
    void load();
    const unsubscribe = subscribeToDocumentChanges(() => void load());
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

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

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = documents?.filter((d) => d.title.toLowerCase().includes(trimmedQuery));
  const unfiledDocuments = documents?.filter((d) => d.folderName === null);

  const toggleFolder = (name: string) =>
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const handleConfirmDocumentDelete = () => {
    if (!documentPendingDelete) return;
    void deleteDocumentAndNavigate(documentPendingDelete.id);
    setDocumentPendingDelete(null);
  };

  const handleConfirmFolderDelete = () => {
    if (!folderPendingDelete) return;
    void deleteFolder(folderPendingDelete);
    setFolderPendingDelete(null);
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

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <SectionHeader
          label={isSearching ? "Results" : "Documents"}
          actionLabel="New document"
          onAction={() => void createAndOpenDocument()}
        />
        <nav aria-label="Documents">
          {(isSearching ? searchResults : unfiledDocuments)?.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-content-tertiary">
              {isSearching ? "No documents match" : "No documents yet"}
            </p>
          )}
          <ul className="mt-1 flex flex-col gap-1">
            {(isSearching ? searchResults : unfiledDocuments)?.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                folders={folders}
                onRequestDelete={setDocumentPendingDelete}
              />
            ))}
          </ul>
        </nav>

        {!isSearching && (
          <>
            <div className="mt-5">
              <SectionHeader
                label="Folders"
                actionLabel="New folder"
                onAction={() => setIsAddingFolder(true)}
              />
            </div>
            {isAddingFolder && (
              <NewFolderInput
                onSubmit={(name) => {
                  setIsAddingFolder(false);
                  void createFolder(name);
                }}
                onCancel={() => setIsAddingFolder(false)}
              />
            )}
            <ul className="mt-1 flex flex-col gap-1">
              {folders.map((folder) => (
                <li key={folder.name}>
                  <FolderRow
                    folder={folder}
                    isExpanded={expandedFolders.has(folder.name)}
                    onToggle={() => toggleFolder(folder.name)}
                    onRequestDelete={() => setFolderPendingDelete(folder.name)}
                  />
                  {expandedFolders.has(folder.name) && (
                    <ul className="mt-1 flex flex-col gap-1 pl-4">
                      {documents
                        ?.filter((d) => d.folderName === folder.name)
                        .map((document) => (
                          <DocumentRow
                            key={document.id}
                            document={document}
                            folders={folders}
                            onRequestDelete={setDocumentPendingDelete}
                          />
                        ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={documentPendingDelete !== null}
        title={`Delete "${documentPendingDelete?.title}"?`}
        message="This document will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDocumentDelete}
        onCancel={() => setDocumentPendingDelete(null)}
      />
      <ConfirmDialog
        isOpen={folderPendingDelete !== null}
        title={`Delete folder "${folderPendingDelete}"?`}
        message="Documents inside will move back to Documents — nothing is deleted."
        confirmLabel="Delete folder"
        onConfirm={handleConfirmFolderDelete}
        onCancel={() => setFolderPendingDelete(null)}
      />
    </div>
  );
}

function SectionHeader({
  label,
  actionLabel,
  onAction,
}: {
  label: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between pl-2">
      <p className="text-[11px] font-semibold tracking-wider text-content-tertiary uppercase">
        {label}
      </p>
      <button
        type="button"
        aria-label={actionLabel}
        onClick={onAction}
        className="flex size-6 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function NewFolderInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <input
      autoFocus
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
        if (e.key === "Escape") onCancel();
      }}
      placeholder="Folder name…"
      aria-label="New folder name"
      className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-surface-app px-2.5 text-sm placeholder:text-content-tertiary focus:border-accent focus:outline-none"
    />
  );
}

function FolderRow({
  folder,
  isExpanded,
  onToggle,
  onRequestDelete,
}: {
  folder: FolderSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 rounded-xl p-2 pr-14 text-left transition-colors hover:bg-surface-hover"
      >
        {isExpanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-content-tertiary" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-content-tertiary" aria-hidden />
        )}
        <Folder className="size-4 shrink-0 text-content-tertiary" aria-hidden />
        <span className="truncate text-sm font-medium text-content-secondary">{folder.name}</span>
      </button>
      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-content-tertiary group-hover:hidden">
        {folder.documentCount}
      </span>
      <button
        type="button"
        aria-label={`Delete folder "${folder.name}"`}
        onClick={onRequestDelete}
        className="absolute top-1/2 right-2 hidden size-6 -translate-y-1/2 items-center justify-center rounded-md text-content-tertiary transition-colors group-hover:flex hover:bg-surface-hover hover:text-danger"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function DocumentRow({
  document,
  folders,
  onRequestDelete,
}: {
  document: EditorDocument;
  folders: FolderSummary[];
  onRequestDelete: (document: EditorDocument) => void;
}) {
  const activeDocumentId = useActiveDocumentId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isActive = document.id === activeDocumentId;
  const moveTargets = folders.filter((folder) => folder.name !== document.folderName);

  return (
    <li className="group relative list-none">
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
        onClick={() => setIsMenuOpen((current) => !current)}
        className={cn(
          "absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md",
          "text-content-tertiary transition-opacity hover:bg-surface-hover hover:text-content-primary",
          isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
      </button>

      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setIsMenuOpen(false)} />
          <div className="absolute top-full right-2 z-40 mt-1 w-44 rounded-xl border border-border-subtle bg-surface-card p-1">
            {moveTargets.map((folder) => (
              <button
                key={folder.name}
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  void moveDocumentToFolder(document.id, folder.name);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-content-secondary transition-colors hover:bg-surface-hover"
              >
                <FolderInput className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">Move to {folder.name}</span>
              </button>
            ))}
            {document.folderName !== null && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  void moveDocumentToFolder(document.id, null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-content-secondary transition-colors hover:bg-surface-hover"
              >
                <FolderInput className="size-3.5 shrink-0" aria-hidden />
                Remove from folder
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onRequestDelete(document);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-danger transition-colors hover:bg-surface-hover"
            >
              <Trash2 className="size-3.5 shrink-0" aria-hidden />
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}
