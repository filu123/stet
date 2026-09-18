"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buildPacerWords, wordDurations, type PacerWord } from "../lib/pacer";
import type { ReadingChunk } from "../types";

export interface ReadingPacer {
  /** The word the light is on, or `null` when the pacer is off. */
  activeWord: PacerWord | null;
  /** It has finished this page and is waiting to be taken to the next. */
  isWaiting: boolean;
  isPaused: boolean;
  togglePaused: () => void;
  /** Start again from the top of this page. */
  restart: () => void;
  wordIndex: number;
  wordCount: number;
}

/**
 * A light that walks the words at the pace you set.
 *
 * The rule that shapes everything here: **it never turns the page.** At the
 * end of a passage it stops on the last word and waits — reading is not a
 * conveyor belt, and a pacer that carried you into the next paragraph while
 * you were still finishing this one would be pushing rather than guiding. Turn
 * the page yourself and it picks up at the first word of what you turned to.
 *
 * Position is stored with the chunk it belongs to, so arriving somewhere new
 * starts at its first word without an effect having to reset anything.
 */
export function useReadingPacer(
  /** Everything on screen: one chunk in the focus modes, a page in page mode. */
  onScreen: ReadingChunk[],
  isEnabled: boolean,
  wordsPerMinute: number,
): ReadingPacer {
  const [position, setPosition] = useState({ chunkIndex: -1, wordIndex: 0 });
  const [waitingAt, setWaitingAt] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const words = useMemo(() => buildPacerWords(onScreen), [onScreen]);
  const durations = useMemo(() => wordDurations(words, wordsPerMinute), [words, wordsPerMinute]);

  // Derived rather than reset: a position belonging to another page simply
  // does not apply to this one. The page is named by its first chunk.
  const chunkIndex = onScreen[0]?.index ?? -1;
  const wordIndex = position.chunkIndex === chunkIndex ? position.wordIndex : 0;
  const isWaiting = waitingAt === chunkIndex || words.length === 0;
  const isRunning = isEnabled && !isPaused && !isWaiting && onScreen.length > 0;

  // Each render schedules the next step; the state change happens in the
  // timer, never in the effect body.
  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setTimeout(() => {
      if (wordIndex >= words.length - 1) {
        setWaitingAt(chunkIndex);
        return;
      }
      setPosition({ chunkIndex, wordIndex: wordIndex + 1 });
    }, durations[wordIndex] ?? 0);
    return () => window.clearTimeout(timer);
  }, [isRunning, chunkIndex, wordIndex, words.length, durations]);

  // A pacer running on in a pocket would empty the page and sit waiting.
  useEffect(() => {
    const handleHide = () => {
      if (document.visibilityState === "hidden") setIsPaused(true);
    };
    document.addEventListener("visibilitychange", handleHide);
    return () => document.removeEventListener("visibilitychange", handleHide);
  }, []);

  const togglePaused = useCallback(() => setIsPaused((paused) => !paused), []);

  const restart = useCallback(() => {
    setWaitingAt(null);
    setPosition({ chunkIndex, wordIndex: 0 });
    setIsPaused(false);
  }, [chunkIndex]);

  // The light stays on the last word once it has stopped, so you can see where
  // it left you rather than losing the place it just gave you.
  const activeWord = isEnabled && words.length > 0 ? (words[wordIndex] ?? null) : null;

  return {
    activeWord,
    isWaiting: isEnabled && isWaiting,
    isPaused,
    togglePaused,
    restart,
    wordIndex,
    wordCount: words.length,
  };
}
