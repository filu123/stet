"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useReaderStore } from "@/stores/reader-store";

import { CHUNK_SIZES, buildChunks } from "../lib/chunker";
import { getBook, getProgress, saveProgress } from "../lib/reader-repository";
import {
  bookProgress,
  clampChunkIndex,
  measuredPace,
  updatePace,
} from "../lib/reading-position";
import type { ReaderBook, ReadingChunk, ReadingProgress } from "../types";

/** Progress is written this long after the reader stops moving. */
const SAVE_DEBOUNCE_MS = 700;

export interface BookReader {
  book: ReaderBook | null;
  isLoading: boolean;
  chunks: ReadingChunk[];
  chunkIndex: number;
  chunk: ReadingChunk | null;
  wordsPerMinute: number | null;
  /** True until the reader dismisses the "where was I" card. */
  isResuming: boolean;
  resume: () => void;
  next: () => void;
  previous: () => void;
  goToChunk: (index: number, options?: { isForwardStep?: boolean }) => void;
  goToChapter: (chapterIndex: number) => void;
}

/**
 * Everything one book needs while it is open: its text, where the reader is in
 * it, and how fast they actually read.
 *
 * Position is stored as a chunk index rather than a scroll offset — change the
 * font size or the chunk size and a pixel offset would mean nothing, while the
 * text either side of you is still the text either side of you.
 */
export function useBookReader(bookId: string | null): BookReader {
  const chunkSize = useReaderStore((state) => state.chunkSize);

  const [book, setBook] = useState<ReaderBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState<number | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  const chunks = useMemo(
    () => (book ? buildChunks(book.chapters, CHUNK_SIZES[chunkSize]) : []),
    [book, chunkSize],
  );

  // Written from event handlers and timers, where render state is already old.
  const stateRef = useRef({ chunkIndex: 0, furthest: 0, wordsRead: 0, msRead: 0, wpm: null as number | null });
  // Stamped when the book opens; a sample taken before that is discarded by
  // `updatePace` anyway, since no one reads a page in negative time.
  const lastAdvanceAtRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const isLoadedRef = useRef(false);

  /* ----- Load ------------------------------------------------------------- */

  useEffect(() => {
    if (!bookId) return;
    let isStale = false;
    isLoadedRef.current = false;

    const load = async () => {
      const [loadedBook, progress] = await Promise.all([getBook(bookId), getProgress(bookId)]);
      if (isStale) return;

      const startIndex = progress?.chunkIndex ?? 0;
      stateRef.current = {
        chunkIndex: startIndex,
        furthest: progress?.furthestChunkIndex ?? startIndex,
        wordsRead: progress?.wordsRead ?? 0,
        msRead: progress?.msRead ?? 0,
        wpm: progress?.wordsPerMinute ?? null,
      };
      lastAdvanceAtRef.current = Date.now();
      isLoadedRef.current = true;

      setBook(loadedBook ?? null);
      setChunkIndex(startIndex);
      setWordsPerMinute(
        measuredPace(
          progress?.wordsRead ?? 0,
          progress?.msRead ?? 0,
          progress?.wordsPerMinute ?? null,
        ),
      );
      // Coming back to page one is not a homecoming; anywhere else is.
      setIsResuming(startIndex > 0);
      setIsLoading(false);
    };

    void load();
    return () => {
      isStale = true;
    };
  }, [bookId]);

  /* ----- Saving ----------------------------------------------------------- */

  /**
   * Saving before the book has loaded would write chunk 0 over a real place in
   * the book. That is not hypothetical: React mounts every component twice in
   * development, and the first unmount fired this cleanup while the load was
   * still in flight — which is exactly why reopening a book started it again
   * from the beginning.
   */
  const flushProgress = useCallback(() => {
    if (!bookId || !isLoadedRef.current) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const state = stateRef.current;
    const progress: ReadingProgress = {
      bookId,
      chunkIndex: state.chunkIndex,
      furthestChunkIndex: state.furthest,
      percent: bookProgress(chunks, state.chunkIndex),
      wordsPerMinute: state.wpm,
      wordsRead: state.wordsRead,
      msRead: state.msRead,
      updatedAt: Date.now(),
    };
    void saveProgress(progress);
  }, [bookId, chunks]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushProgress, SAVE_DEBOUNCE_MS);
  }, [flushProgress]);

  // A phone reader does not close the tab; they lock the screen or swipe away,
  // and `visibilitychange` is the only event that reliably fires for that.
  useEffect(() => {
    if (!bookId) return;
    const handleHide = () => {
      if (document.visibilityState === "hidden") flushProgress();
    };
    document.addEventListener("visibilitychange", handleHide);
    return () => {
      document.removeEventListener("visibilitychange", handleHide);
      flushProgress();
    };
  }, [bookId, flushProgress]);

  /* ----- Moving ----------------------------------------------------------- */

  const goToChunk = useCallback(
    (index: number, options?: { isForwardStep?: boolean }) => {
      const state = stateRef.current;
      const target = clampChunkIndex(chunks, index);
      if (target === state.chunkIndex) return;

      // Only a single step forward is evidence of reading. A jump, a scrub or
      // a step back says nothing about pace and must not pollute it.
      if (options?.isForwardStep) {
        const now = Date.now();
        const elapsed = now - lastAdvanceAtRef.current;
        // A page turn crosses several chunks; a chunk turn crosses one.
        const words = chunks
          .slice(state.chunkIndex, target)
          .reduce((total, chunk) => total + chunk.wordCount, 0);
        state.wpm = updatePace(state.wpm, words, elapsed);
        if (target > state.furthest) {
          state.wordsRead += words;
          // A page left open while the reader made tea is not reading time.
          state.msRead += Math.min(elapsed, 5 * 60_000);
        }
        setWordsPerMinute(measuredPace(state.wordsRead, state.msRead, state.wpm));
      }
      lastAdvanceAtRef.current = Date.now();

      state.chunkIndex = target;
      state.furthest = Math.max(state.furthest, target);
      setChunkIndex(target);
      scheduleSave();
    },
    [chunks, scheduleSave],
  );

  const next = useCallback(
    () => goToChunk(stateRef.current.chunkIndex + 1, { isForwardStep: true }),
    [goToChunk],
  );
  const previous = useCallback(() => goToChunk(stateRef.current.chunkIndex - 1), [goToChunk]);

  const goToChapter = useCallback(
    (chapterIndex: number) => {
      const target = chunks.findIndex((chunk) => chunk.chapterIndex === chapterIndex);
      if (target >= 0) goToChunk(target);
    },
    [chunks, goToChunk],
  );

  // Changing the chunk size repaginates the book under the reader; keep them
  // roughly where they were rather than throwing them back to the start.
  useEffect(() => {
    if (chunks.length === 0) return;
    const clamped = clampChunkIndex(chunks, stateRef.current.chunkIndex);
    if (clamped === stateRef.current.chunkIndex) return;
    stateRef.current.chunkIndex = clamped;
    setChunkIndex(clamped);
  }, [chunks]);

  const resume = useCallback(() => {
    lastAdvanceAtRef.current = Date.now();
    setIsResuming(false);
  }, []);

  return {
    book,
    isLoading,
    chunks,
    chunkIndex,
    chunk: chunks[chunkIndex] ?? null,
    wordsPerMinute,
    isResuming,
    resume,
    next,
    previous,
    goToChunk,
    goToChapter,
  };
}
