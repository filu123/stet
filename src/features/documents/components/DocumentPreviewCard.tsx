"use client";

import { Folder, Trash2 } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { EditorDocument } from "@/types/document";

import { extractSnippet } from "../lib/extract-snippet";

interface DocumentPreviewCardProps {
  document: EditorDocument;
  /** When provided, a delete button appears on hover. */
  onRequestDelete?: (document: EditorDocument) => void;
}

/** A card in the documents grid: title, snippet, folder, last-edited time. */
export function DocumentPreviewCard({ document, onRequestDelete }: DocumentPreviewCardProps) {
  const snippet = extractSnippet(document.content);

  return (
    <div className="group relative">
      <Link
        href={`/document/${document.id}`}
        className={cn(
          "flex h-44 flex-col rounded-card border border-border-subtle bg-surface-card p-4",
          "transition-colors hover:border-content-tertiary",
        )}
      >
        <h3 className="line-clamp-2 text-sm font-semibold text-content-primary">
          {document.title}
        </h3>
        <p className="mt-1.5 line-clamp-4 flex-1 text-xs leading-relaxed text-content-tertiary">
          {snippet || "Empty document"}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-content-tertiary">
          {document.folderName && (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-surface-app px-1.5 py-0.5">
              <Folder className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{document.folderName}</span>
            </span>
          )}
          <span className="ml-auto shrink-0">{formatRelativeTime(document.updatedAt)}</span>
        </div>
      </Link>

      {onRequestDelete && (
        <button
          type="button"
          aria-label={`Delete "${document.title}"`}
          onClick={() => onRequestDelete(document)}
          className={cn(
            "absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-lg bg-surface-card",
            "text-content-tertiary opacity-0 transition-opacity hover:bg-surface-hover hover:text-danger",
            "group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
