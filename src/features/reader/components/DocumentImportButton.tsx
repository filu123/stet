"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { listDocumentsByRecency } from "@/features/documents";
import { documentContentToMarkdown } from "@/features/editor";
import type { EditorDocument } from "@/types/document";

import { parseMarkdownBook } from "../lib/markdown-book";
import { requestPersistentStorage } from "../lib/reader-db";
import { addBook } from "../lib/reader-repository";

/**
 * Read something you wrote next door.
 *
 * The document is serialised to Markdown and parsed like any other book, so it
 * arrives with its headings as chapters and its italics intact. A copy, not a
 * link: editing the document later will not disturb the reading of it, and the
 * reader stays read-only.
 */
export function DocumentImportButton() {
  const router = useRouter();
  const [documents, setDocuments] = useState<EditorDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setError(null);
    try {
      setDocuments(await listDocumentsByRecency());
    } catch {
      setError("Couldn't reach your documents.");
    }
  };

  const importDocument = async (document: EditorDocument) => {
    try {
      const markdown = documentContentToMarkdown(document.content);
      if (markdown.trim().length < 200) throw new Error("That document is nearly empty.");
      const parsed = parseMarkdownBook(markdown, document.title || "Untitled");
      const book = await addBook({ ...parsed, title: document.title || parsed.title }, "document");
      void requestPersistentStorage();
      router.push(`/read/${book.id}`);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Couldn't read that document.");
    }
  };

  return (
    <>
      <button type="button" onClick={open} className="reader-secondary-button">
        <FileText className="size-4" aria-hidden />
        From your documents
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {documents && (
        <>
          <div className="reader-scrim" onClick={() => setDocuments(null)} aria-hidden />
          <div role="dialog" aria-label="Your documents" className="reader-sheet">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-content-primary">Your documents</h2>
              <IconButton aria-label="Close" onClick={() => setDocuments(null)}>
                <X className="size-4" aria-hidden />
              </IconButton>
            </div>

            {documents.length === 0 && (
              <p className="py-6 text-center text-sm text-content-tertiary">
                Nothing written yet.
              </p>
            )}

            <ul className="max-h-[50vh] overflow-y-auto overscroll-contain">
              {documents.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => importDocument(document)}
                    className="reader-contents-row w-full"
                  >
                    <FileText className="size-3.5 shrink-0 text-content-tertiary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-left">
                      {document.title || "Untitled"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
