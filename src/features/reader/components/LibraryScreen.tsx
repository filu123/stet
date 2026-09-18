"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Trash2 } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";

import { deleteBook, listBooks, listProgress } from "../lib/reader-repository";
import { formatEstimate, measuredPace, minutesFor } from "../lib/reading-position";
import type { ReaderBook, ReadingProgress } from "../types";

import { BookImportButton } from "./BookImportButton";
import { DocumentImportButton } from "./DocumentImportButton";

/**
 * The shelf.
 *
 * Deliberately the only progression system for now: finishing a book is a real
 * event, and a shelf that fills up is a reward that needs no character, no
 * shop, and no art — the covers come from the books.
 */
export function LibraryScreen() {
  const books = useLiveQuery(() => listBooks(), [], undefined);
  const progressList = useLiveQuery(() => listProgress(), [], undefined);
  const progressByBook = new Map((progressList ?? []).map((entry) => [entry.bookId, entry]));

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-content-primary">Reading</h1>
        <p className="mt-1 text-sm text-content-secondary">
          One piece at a time, on the screen in your hand.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-2">
        <BookImportButton />
        <DocumentImportButton />
      </div>

      {books?.length === 0 && (
        <p className="rounded-xl border border-border-subtle bg-surface-card px-4 py-8 text-center text-sm text-content-tertiary">
          Nothing on the shelf yet. Project Gutenberg&apos;s plain-text books work as they are.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {books?.map((book) => (
          <li key={book.id}>
            <BookRow book={book} progress={progressByBook.get(book.id)} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function BookRow({
  book,
  progress,
}: {
  book: ReaderBook;
  progress: ReadingProgress | undefined;
}) {
  const percent = progress?.percent ?? 0;
  const wordsLeft = Math.max(0, Math.round(book.wordCount * (1 - percent)));
  const pace = measuredPace(
    progress?.wordsRead ?? 0,
    progress?.msRead ?? 0,
    progress?.wordsPerMinute ?? null,
  );
  const timeLeft = formatEstimate(minutesFor(wordsLeft, pace), pace);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-card px-4 py-3">
      <Link href={`/read/${book.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="reader-shelf-mark" aria-hidden>
          <BookOpen className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-content-primary">{book.title}</span>
          <span className="block truncate text-xs text-content-tertiary">
            {book.author ? `${book.author} · ` : ""}
            {percent > 0 ? `${Math.round(percent * 100)}% · ${timeLeft} left` : `${timeLeft} to read`}
          </span>
          <span className="reader-shelf-progress" aria-hidden>
            <span style={{ width: `${percent * 100}%` }} />
          </span>
        </span>
      </Link>
      <IconButton
        aria-label={`Remove ${book.title}`}
        onClick={() => {
          if (window.confirm(`Remove "${book.title}" and your place in it?`)) {
            void deleteBook(book.id);
          }
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
    </div>
  );
}
