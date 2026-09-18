"use client";

import { Minus, Pause, Play, Plus } from "lucide-react";

import {
  PACER_WPM_STEP,
  useReaderStore,
} from "@/stores/reader-store";

import type { ReadingPacer } from "../hooks/useReadingPacer";

/**
 * The pacer's own controls, sitting just above the progress bar where a thumb
 * already is.
 *
 * It has to live outside the reading surface: every tap in there turns a page,
 * and a pause button you cannot press without losing your place would be worse
 * than no pause button.
 */
export function PacerControl({ pacer }: { pacer: ReadingPacer }) {
  const wordsPerMinute = useReaderStore((state) => state.pacerWordsPerMinute);
  const setWordsPerMinute = useReaderStore((state) => state.setPacerWordsPerMinute);

  return (
    <div role="group" aria-label="Reading pace" className="reader-pacer-bar">
      <button
        type="button"
        aria-label={pacer.isPaused ? "Start the pacer" : "Pause the pacer"}
        onClick={pacer.isWaiting ? pacer.restart : pacer.togglePaused}
        className="reader-pacer-button"
      >
        {pacer.isPaused || pacer.isWaiting ? (
          <Play className="size-4" aria-hidden />
        ) : (
          <Pause className="size-4" aria-hidden />
        )}
      </button>

      <span className="min-w-0 flex-1 truncate text-center text-xs text-content-tertiary">
        {pacer.isWaiting ? (
          // The pacer has finished the page and will not turn it — saying so
          // is the difference between "waiting for you" and "broken".
          <span className="text-content-secondary">Swipe on when you&apos;re ready</span>
        ) : (
          <span className="tabular-nums">{wordsPerMinute} wpm</span>
        )}
      </span>

      <button
        type="button"
        aria-label="Slower"
        onClick={() => setWordsPerMinute(wordsPerMinute - PACER_WPM_STEP)}
        className="reader-pacer-button"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Faster"
        onClick={() => setWordsPerMinute(wordsPerMinute + PACER_WPM_STEP)}
        className="reader-pacer-button"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
