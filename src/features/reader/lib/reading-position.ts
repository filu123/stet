import type { ReadingChunk } from "../types";

/**
 * Where you are, how fast you read, and how near the end of *something* you
 * are — which is the whole motivational engine. A book is a mountain; "two
 * minutes to the end of this scene" is a step.
 */

/** Nobody reads slower or faster than this; anything else is a stale tab. */
const MIN_WPM = 60;
const MAX_WPM = 700;
const DEFAULT_WPM = 220;
/** Weight of the newest sample in the pace average. */
const PACE_SMOOTHING = 0.25;

export function bookProgress(chunks: ReadingChunk[], chunkIndex: number): number {
  const total = totalWords(chunks);
  if (total === 0) return 0;
  const chunk = chunks[clampChunkIndex(chunks, chunkIndex)];
  return Math.min(1, (chunk.wordsBefore + chunk.wordCount) / total);
}

export function totalWords(chunks: ReadingChunk[]): number {
  const last = chunks[chunks.length - 1];
  return last ? last.wordsBefore + last.wordCount : 0;
}

export function clampChunkIndex(chunks: ReadingChunk[], chunkIndex: number): number {
  if (!Number.isFinite(chunkIndex)) return 0;
  return Math.min(Math.max(Math.trunc(chunkIndex), 0), Math.max(0, chunks.length - 1));
}

/**
 * Words from here to the end of the current scene — or the chapter, if the
 * scene runs on past it. `null` when the book itself ends first.
 */
export type BreakKind = "scene" | "chapter" | "pause";

export function wordsToNextBreak(
  chunks: ReadingChunk[],
  chunkIndex: number,
): { words: number; kind: BreakKind } | null {
  const start = clampChunkIndex(chunks, chunkIndex);
  let words = 0;
  for (let index = start; index < chunks.length; index++) {
    words += chunks[index].wordCount;
    if (chunks[index].endsScene) return { words, kind: "scene" };
    if (chunks[index].endsChapter) return { words, kind: "chapter" };
    if (chunks[index].isRestPoint) return { words, kind: "pause" };
  }
  return null;
}

export function minutesFor(words: number, wordsPerMinute: number | null): number {
  return words / (wordsPerMinute ?? DEFAULT_WPM);
}

/** Enough reading to believe the number rather than guess it. */
const TRUSTWORTHY_MS = 3 * 60_000;
const TRUSTWORTHY_WORDS = 400;

/**
 * The pace to quote a reader.
 *
 * A whole session's words over its whole time beats the per-chunk average once
 * there is enough of it: it has already absorbed the pauses, the re-reads and
 * the paragraph someone read three times, which is what actually decides when
 * they finish a book. Below that threshold the running average stands, and
 * below *that*, nothing has been measured at all and the caller should say so.
 */
export function measuredPace(
  wordsRead: number,
  msRead: number,
  runningAverage: number | null,
): number | null {
  if (msRead >= TRUSTWORTHY_MS && wordsRead >= TRUSTWORTHY_WORDS) {
    const overall = wordsRead / (msRead / 60000);
    if (overall >= MIN_WPM && overall <= MAX_WPM) return overall;
  }
  return runningAverage;
}

/** Words from the current page to the last one. */
export function wordsRemaining(chunks: ReadingChunk[], chunkIndex: number): number {
  const chunk = chunks[clampChunkIndex(chunks, chunkIndex)];
  if (!chunk) return 0;
  return Math.max(0, totalWords(chunks) - (chunk.wordsBefore + chunk.wordCount));
}

/**
 * "about 3 hr" while the estimate is still a guess, "3 hr" once it is the
 * reader's own pace. The hedge is worth a word: a first-time estimate that
 * turns out to be double is how an app loses someone's trust quietly.
 */
export function formatEstimate(minutes: number, wordsPerMinute: number | null): string {
  const duration = formatDuration(minutes);
  return wordsPerMinute === null ? `about ${duration}` : duration;
}

/**
 * Folds a reading sample into the running pace.
 *
 * Samples outside human reading speed are dropped rather than clamped: a tab
 * left open all night should not convince the app you read at 3 wpm, and a
 * reader flicking through to find their place is not reading at 4000.
 */
export function updatePace(
  currentWpm: number | null,
  words: number,
  milliseconds: number,
): number | null {
  if (words <= 0 || milliseconds <= 0) return currentWpm;
  const sample = words / (milliseconds / 60000);
  if (sample < MIN_WPM || sample > MAX_WPM) return currentWpm;
  if (currentWpm === null) return sample;
  return currentWpm * (1 - PACE_SMOOTHING) + sample * PACE_SMOOTHING;
}

/** "3 min" / "under a minute" / "1 hr 10 min" — never a bare decimal. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) return "under a minute";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** The offer the reader is actually weighing: one more scene, or stop here. */
export function nextBreakLabel(
  chunks: ReadingChunk[],
  chunkIndex: number,
  wordsPerMinute: number | null,
): string | null {
  const next = wordsToNextBreak(chunks, chunkIndex);
  if (!next) return null;
  const time = formatEstimate(minutesFor(next.words, wordsPerMinute), wordsPerMinute);
  if (next.kind === "pause") return `${time} to a good place to stop`;
  return `${time} to the end of this ${next.kind}`;
}
