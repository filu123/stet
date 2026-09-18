"use client";

import { useCallback, useEffect, useState } from "react";

import { addBookmark, deleteBookmark, listBookmarks } from "../lib/reader-repository";
import type { Bookmark, ReadingChunk } from "../types";

/** How much of the page a bookmark quotes back, so the list is readable. */
const EXCERPT_CHARS = 90;

export interface Bookmarks {
  bookmarks: Bookmark[];
  /** The bookmark on the page being read, if there is one. */
  current: Bookmark | null;
  toggle: (chunk: ReadingChunk) => void;
  remove: (id: string) => void;
}

export function useBookmarks(bookId: string | null, chunkIndex: number): Bookmarks {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (!bookId) return;
    let isStale = false;
    void listBookmarks(bookId).then((stored) => {
      if (!isStale) setBookmarks(stored);
    });
    return () => {
      isStale = true;
    };
  }, [bookId]);

  const current = bookmarks.find((bookmark) => bookmark.chunkIndex === chunkIndex) ?? null;

  const remove = useCallback((id: string) => {
    setBookmarks((existing) => existing.filter((bookmark) => bookmark.id !== id));
    void deleteBookmark(id);
  }, []);

  const toggle = useCallback(
    (chunk: ReadingChunk) => {
      if (!bookId) return;
      const existing = bookmarks.find((bookmark) => bookmark.chunkIndex === chunk.index);
      if (existing) {
        remove(existing.id);
        return;
      }
      void addBookmark({
        bookId,
        chunkIndex: chunk.index,
        chapterIndex: chunk.chapterIndex,
        excerpt: excerptOf(chunk),
      }).then((saved) => setBookmarks((existing) => [...existing, saved]));
    },
    [bookId, bookmarks, remove],
  );

  return { bookmarks, current, toggle, remove };
}

function excerptOf(chunk: ReadingChunk): string {
  const text = chunk.blocks
    .filter((block) => block.kind === "paragraph" || block.kind === "quote")
    .map((block) => block.text)
    .join(" ")
    .trim();
  if (!text) return chunk.blocks[0]?.text ?? "";
  return text.length <= EXCERPT_CHARS ? text : `${text.slice(0, EXCERPT_CHARS).trimEnd()}…`;
}
