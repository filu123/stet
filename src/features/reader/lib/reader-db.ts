import Dexie, { type EntityTable } from "dexie";

import type {
  BookHighlight,
  Bookmark,
  CharacterNote,
  ReaderBook,
  ReadingProgress,
} from "../types";

/**
 * The reader's own IndexedDB database — deliberately not the editor's.
 *
 * Books are large, immutable and read on a phone; documents are small, mutable
 * and edited. Sharing one database would mean one schema history for two things
 * that will change for entirely different reasons.
 *
 * Access rules match the editor's: components never import this file. Reads and
 * writes go through `reader-repository.ts`.
 *
 * On iOS, Safari clears IndexedDB for a site left unvisited for a week unless
 * it has been installed to the home screen — see `requestPersistentStorage`.
 */
export const readerDatabase = new Dexie("stet-reader") as Dexie & {
  books: EntityTable<ReaderBook, "id">;
  progress: EntityTable<ReadingProgress, "bookId">;
  characterNotes: EntityTable<CharacterNote & { key: string }, "key">;
  bookmarks: EntityTable<Bookmark, "id">;
  highlights: EntityTable<BookHighlight, "id">;
};

readerDatabase.version(1).stores({
  // Indexed fields only; chapters and blocks are stored but never queried.
  books: "id, title, addedAt",
  progress: "bookId, updatedAt",
  characterNotes: "key, bookId",
});

// v2: the reader's own marks — places kept and passages highlighted. They live
// beside the book rather than inside it, so re-importing a cleaner copy of the
// same novel never costs the reader their annotations.
readerDatabase.version(2).stores({
  bookmarks: "id, bookId, chunkIndex",
  highlights: "id, bookId, [bookId+chapterIndex]",
});

/**
 * Asks the browser not to evict the library. Best-effort by design: Chrome
 * grants it on engagement, Safari largely ignores it, and the real protection
 * on iOS is installing the app to the home screen.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
