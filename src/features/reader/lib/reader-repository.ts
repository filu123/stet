import { randomId } from "@/lib/utils/random-id";

import type {
  BookHighlight,
  Bookmark,
  CharacterNote,
  ParsedBook,
  ReaderBook,
  ReadingProgress,
} from "../types";

import { readerDatabase } from "./reader-db";

/** Every read and write the reader performs. Components use this, not Dexie. */

export async function addBook(
  parsed: ParsedBook,
  source: ReaderBook["source"],
): Promise<ReaderBook> {
  const book: ReaderBook = { ...parsed, id: randomId(), addedAt: Date.now(), source };
  await readerDatabase.books.add(book);
  return book;
}

export function getBook(bookId: string): Promise<ReaderBook | undefined> {
  return readerDatabase.books.get(bookId);
}

export function listBooks(): Promise<ReaderBook[]> {
  return readerDatabase.books.orderBy("addedAt").reverse().toArray();
}

/** Removes the book and everything that only existed because of it. */
export async function deleteBook(bookId: string): Promise<void> {
  await readerDatabase.transaction(
    "rw",
    readerDatabase.books,
    readerDatabase.progress,
    readerDatabase.characterNotes,
    readerDatabase.bookmarks,
    readerDatabase.highlights,
    async () => {
      await readerDatabase.books.delete(bookId);
      await readerDatabase.progress.delete(bookId);
      await readerDatabase.characterNotes.where("bookId").equals(bookId).delete();
      await readerDatabase.bookmarks.where("bookId").equals(bookId).delete();
      await readerDatabase.highlights.where("bookId").equals(bookId).delete();
    },
  );
}

export function getProgress(bookId: string): Promise<ReadingProgress | undefined> {
  return readerDatabase.progress.get(bookId);
}

export function listProgress(): Promise<ReadingProgress[]> {
  return readerDatabase.progress.toArray();
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
  await readerDatabase.progress.put(progress);
}

/* ----- Bookmarks ---------------------------------------------------------- */

export function listBookmarks(bookId: string): Promise<Bookmark[]> {
  return readerDatabase.bookmarks.where("bookId").equals(bookId).toArray();
}

export async function addBookmark(
  bookmark: Omit<Bookmark, "id" | "createdAt">,
): Promise<Bookmark> {
  const saved: Bookmark = { ...bookmark, id: randomId(), createdAt: Date.now() };
  await readerDatabase.bookmarks.add(saved);
  return saved;
}

export async function deleteBookmark(id: string): Promise<void> {
  await readerDatabase.bookmarks.delete(id);
}

/* ----- Highlights --------------------------------------------------------- */

export function listHighlights(bookId: string): Promise<BookHighlight[]> {
  return readerDatabase.highlights.where("bookId").equals(bookId).toArray();
}

export async function addHighlight(
  highlight: Omit<BookHighlight, "id" | "createdAt">,
): Promise<BookHighlight> {
  const saved: BookHighlight = { ...highlight, id: randomId(), createdAt: Date.now() };
  await readerDatabase.highlights.add(saved);
  return saved;
}

export async function updateHighlightColor(id: string, color: string): Promise<void> {
  await readerDatabase.highlights.update(id, { color });
}

export async function deleteHighlight(id: string): Promise<void> {
  await readerDatabase.highlights.delete(id);
}

/* ----- Character notes ---------------------------------------------------- */

const noteKey = (bookId: string, name: string) => `${bookId}::${name}`;

export async function listCharacterNotes(bookId: string): Promise<CharacterNote[]> {
  return readerDatabase.characterNotes.where("bookId").equals(bookId).toArray();
}

export async function saveCharacterNotes(notes: CharacterNote[]): Promise<void> {
  await readerDatabase.characterNotes.bulkPut(
    notes.map((note) => ({ ...note, key: noteKey(note.bookId, note.name) })),
  );
}
