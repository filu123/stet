"use client";

import { Bookmark as BookmarkIcon, Check, X } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";

import { formatEstimate, minutesFor } from "../lib/reading-position";
import type { Bookmark, ReadingChunk } from "../types";

interface ContentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitles: (string | null)[];
  chunks: ReadingChunk[];
  chunkIndex: number;
  bookmarks: Bookmark[];
  wordsPerMinute: number | null;
  onGoToChunk: (index: number) => void;
  onGoToChapter: (chapterIndex: number) => void;
  onRemoveBookmark: (id: string) => void;
}

/**
 * Where you can go: the chapters, and the places you kept.
 *
 * Each chapter carries how long it takes at your pace, not how many pages it
 * has — "6 min" is a decision you can make on a bus, "14 pages" is not.
 */
export function ContentsPanel({
  isOpen,
  onClose,
  chapterTitles,
  chunks,
  chunkIndex,
  bookmarks,
  wordsPerMinute,
  onGoToChunk,
  onGoToChapter,
  onRemoveBookmark,
}: ContentsPanelProps) {
  if (!isOpen) return null;

  const currentChapter = chunks[chunkIndex]?.chapterIndex ?? 0;
  // One pass, not one per chapter: a novel is thousands of chunks and this
  // runs on every render while the panel is open.
  const chapterWords = chapterTitles.map(() => 0);
  for (const chunk of chunks) chapterWords[chunk.chapterIndex] += chunk.wordCount;

  return (
    <>
      <div className="reader-scrim" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label="Contents" className="reader-panel">
        <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-medium text-content-primary">Contents</h2>
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {bookmarks.length > 0 && (
            <section className="mb-4">
              <h3 className="px-2 pb-1 text-xs text-content-tertiary">Bookmarks</h3>
              <ul className="flex flex-col">
                {bookmarks
                  .slice()
                  .sort((a, b) => a.chunkIndex - b.chunkIndex)
                  .map((bookmark) => (
                    <li key={bookmark.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onGoToChunk(bookmark.chunkIndex);
                          onClose();
                        }}
                        className="reader-contents-row flex-1"
                      >
                        <BookmarkIcon
                          className="size-3.5 shrink-0 text-content-tertiary"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {bookmark.excerpt}
                        </span>
                      </button>
                      <IconButton
                        aria-label="Remove bookmark"
                        onClick={() => onRemoveBookmark(bookmark.id)}
                      >
                        <X className="size-3.5" aria-hidden />
                      </IconButton>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <h3 className="px-2 pb-1 text-xs text-content-tertiary">Chapters</h3>
          <ul className="flex flex-col">
            {chapterTitles.map((title, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => {
                    onGoToChapter(index);
                    onClose();
                  }}
                  className={cn(
                    "reader-contents-row w-full",
                    index === currentChapter && "is-current",
                  )}
                >
                  {index === currentChapter ? (
                    <Check className="size-3.5 shrink-0 text-accent" aria-hidden />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate text-left">
                    {title ?? "Opening"}
                  </span>
                  <span className="shrink-0 text-xs text-content-tertiary tabular-nums">
                    {formatEstimate(minutesFor(chapterWords[index], wordsPerMinute), wordsPerMinute)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
