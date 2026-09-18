"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { useRouter } from "next/navigation";
import { FilePlus2, Loader2 } from "lucide-react";

import { IMPORTABLE_BOOK_ACCEPT, parseBookFile } from "../lib/book-import";
import { addBook } from "../lib/reader-repository";
import { requestPersistentStorage } from "../lib/reader-db";

/**
 * Getting a book in has to be nearly free, because it happens before any of
 * the reading does — and friction here is friction on the whole habit.
 *
 * Plain text and Markdown for now: Project Gutenberg's `.txt` files need no
 * parser and are a legally clean, DRM-free corpus, and `.md` is what a book
 * written or exported anywhere else tends to arrive as. EPUB produces the same
 * `ParsedBook` shape when it lands.
 */
export function BookImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setError(null);
    try {
      const text = await file.text();
      if (text.trim().length < 200) throw new Error("That file has almost nothing in it.");
      const book = await addBook(parseBookFile(file.name, text), "text-file");
      // Ask now, while the library has something worth keeping in it.
      void requestPersistentStorage();
      router.push(`/read/${book.id}`);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Couldn't read that file.");
      setIsImporting(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={IMPORTABLE_BOOK_ACCEPT}
        className="sr-only"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={isImporting}
        onClick={() => inputRef.current?.click()}
        className="reader-primary-button"
      >
        {isImporting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <FilePlus2 className="size-4" aria-hidden />
        )}
        {isImporting ? "Reading it in…" : "Add a book (.txt or .md)"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
