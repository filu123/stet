"use client";

import { ArrowRight, FileText, Plus } from "lucide-react";
import Link from "next/link";

import { useDocumentActions } from "../hooks/useDocumentActions";
import { useDocumentLibrary } from "../hooks/useDocumentLibrary";
import { DocumentPreviewCard } from "./DocumentPreviewCard";

const RECENT_LIMIT = 8;
const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The `/` home dashboard: a greeting, quick actions, and recent documents. */
export function HomeScreen() {
  const { documents, folders } = useDocumentLibrary();
  const { createAndOpenDocument } = useDocumentActions();

  const recent = documents?.slice(0, RECENT_LIMIT);
  const hasDocuments = documents !== undefined && documents.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-8">
        {/* Time-of-day differs between server and client render — let the client win. */}
        <h1
          suppressHydrationWarning
          className="text-2xl font-bold tracking-tight text-content-primary"
        >
          {greeting()}
        </h1>
        <p className="mt-1 text-sm text-content-tertiary">
          {documents === undefined
            ? "Loading your workspace…"
            : documents.length === 0
              ? "A calm place to write. Start your first document."
              : `${documents.length} ${documents.length === 1 ? "document" : "documents"}` +
                (folders.length > 0
                  ? ` · ${folders.length} ${folders.length === 1 ? "folder" : "folders"}`
                  : "")}
        </p>
      </header>

      <div className="mb-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void createAndOpenDocument()}
          className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          New document
        </button>
        <Link
          href="/documents"
          className="flex h-10 items-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-4 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
        >
          <FileText className="size-4" aria-hidden />
          Browse all
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider text-content-tertiary uppercase">
            Recent
          </h2>
          {hasDocuments && (
            <Link
              href="/documents"
              className="flex items-center gap-1 text-xs font-medium text-content-tertiary transition-colors hover:text-content-primary"
            >
              View all
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          )}
        </div>

        {hasDocuments ? (
          <div className={GRID_CLASS}>
            {recent?.map((document) => (
              <DocumentPreviewCard key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-border-subtle bg-surface-card py-16 text-center">
            <FileText className="size-7 text-content-tertiary" aria-hidden />
            <p className="text-sm text-content-tertiary">
              {documents === undefined ? "Loading…" : "Your documents will appear here."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
