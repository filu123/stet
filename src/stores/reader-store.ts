import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ChunkSizeName } from "@/features/reader/lib/chunker";

/**
 * How this reader likes to read. Persisted, because the whole point is that
 * they come back tomorrow and it is still set up the way they left it.
 *
 * `step` shows one chunk alone: the most focus, the least context.
 * `spotlight` keeps the page and lights only the current chunk: less focus,
 * but you can see where you are.
 * `none` is neither: a full page of the book, turned a page at a time, for
 * when the focus aids are the thing getting in the way.
 *
 * Different brains want different ones, and the same reader wants different
 * ones at different times of day.
 */
export type ReaderFocusMode = "step" | "spotlight" | "none";

interface ReaderPreferencesState {
  focusMode: ReaderFocusMode;
  chunkSize: ChunkSizeName;
  /** Body size in px — the one setting people reach for on a phone. */
  fontSize: number;
  /** The tap zones are invisible, so they have to be shown once. */
  hasSeenGestureHint: boolean;
  /** The last colour used — what the pen sweeps with, no picker involved. */
  highlightColor: string;
  /** The word-by-word guide, and how fast it walks. */
  isPacerEnabled: boolean;
  pacerWordsPerMinute: number;
  setFocusMode: (focusMode: ReaderFocusMode) => void;
  setChunkSize: (chunkSize: ChunkSizeName) => void;
  setFontSize: (fontSize: number) => void;
  setHighlightColor: (highlightColor: string) => void;
  setPacerEnabled: (isPacerEnabled: boolean) => void;
  setPacerWordsPerMinute: (pacerWordsPerMinute: number) => void;
  markGestureHintSeen: () => void;
}

/** Comfortable guidance at the low end, speed reading at the high. */
export const PACER_WPM_MIN = 120;
export const PACER_WPM_MAX = 800;
export const PACER_WPM_STEP = 20;

export const READER_FONT_SIZES = [17, 19, 21, 24, 27] as const;

export const useReaderStore = create<ReaderPreferencesState>()(
  persist(
    (set) => ({
      focusMode: "step",
      chunkSize: "medium",
      fontSize: 21,
      hasSeenGestureHint: false,
      highlightColor: "var(--pill-yellow-bg)",
      isPacerEnabled: false,
      pacerWordsPerMinute: 300,
      setFocusMode: (focusMode) => set({ focusMode }),
      setChunkSize: (chunkSize) => set({ chunkSize }),
      setFontSize: (fontSize) => set({ fontSize }),
      setHighlightColor: (highlightColor) => set({ highlightColor }),
      setPacerEnabled: (isPacerEnabled) => set({ isPacerEnabled }),
      setPacerWordsPerMinute: (pacerWordsPerMinute) =>
        set({
          pacerWordsPerMinute: Math.min(
            PACER_WPM_MAX,
            Math.max(PACER_WPM_MIN, pacerWordsPerMinute),
          ),
        }),
      markGestureHintSeen: () => set({ hasSeenGestureHint: true }),
    }),
    { name: "stet-reader-preferences" },
  ),
);
