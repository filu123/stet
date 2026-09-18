import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { buildCharacterIndex } from "./character-index";
import { CHUNK_SIZES, buildChunks } from "./chunker";
import { parsePlainTextBook } from "./plain-text-book";
import { bookProgress, wordsToNextBreak } from "./reading-position";

/**
 * The whole pipeline over a real 160,000-word novel.
 *
 * Fixtures cannot catch what actual books do: a journal novel whose every
 * other sentence starts with "I", chapters titled on a second line, six
 * thousand words with no scene break. This is skipped unless the book is
 * present, so it costs nothing in CI:
 *
 *   mkdir -p .local-books
 *   curl -sL https://www.gutenberg.org/cache/epub/345/pg345.txt -o .local-books/dracula.txt
 */
const BOOK_PATH = resolve(process.cwd(), ".local-books/dracula.txt");

describe.skipIf(!existsSync(BOOK_PATH))("a real novel, end to end", () => {
  let book: ReturnType<typeof parsePlainTextBook>;
  let chunks: ReturnType<typeof buildChunks>;

  // The suite is skipped when the optional local fixture is absent. Keep the
  // file read in a lifecycle hook so Vitest does not evaluate it while merely
  // collecting a skipped suite in CI.
  beforeAll(() => {
    book = parsePlainTextBook(readFileSync(BOOK_PATH, "utf8"), "dracula.txt");
    chunks = buildChunks(book.chapters, CHUNK_SIZES.medium);
  });

  it("reads the metadata out of the Gutenberg header", () => {
    expect(book.title).toContain("Dracula");
    expect(book.author).toContain("Stoker");
    expect(book.wordCount).toBeGreaterThan(140_000);
  });

  it("finds the real chapters and not hundreds of false ones", () => {
    expect(book.chapters.length).toBeGreaterThanOrEqual(20);
    expect(book.chapters.length).toBeLessThanOrEqual(40);
  });

  it("keeps essentially every chunk inside the promised size", () => {
    const oversized = chunks.filter((chunk) => chunk.wordCount > CHUNK_SIZES.medium.max);
    expect(oversized.length / chunks.length).toBeLessThan(0.02);
  });

  it("loses no words between the book and its chunks", () => {
    const chunked = chunks.reduce((total, chunk) => total + chunk.wordCount, 0);
    expect(chunked).toBe(book.wordCount);
  });

  it("always has somewhere to stop within a few minutes", () => {
    // Dracula runs nearly 7,000 words between scene breaks in places — half an
    // hour with no finish line, which is what rest points exist to fix.
    const distances = chunks.map((_, index) => wordsToNextBreak(chunks, index)?.words ?? 0);
    expect(Math.max(...distances)).toBeLessThan(1500);
  });

  it("runs progress cleanly from the first page to the last", () => {
    expect(bookProgress(chunks, 0)).toBeGreaterThan(0);
    expect(bookProgress(chunks, chunks.length - 1)).toBe(1);
  });

  it("names the actual cast and cannot name it early", () => {
    const whole = buildCharacterIndex(chunks, chunks.length - 1).map((entry) => entry.name);
    expect(whole).toContain("Van Helsing");
    expect(whole).toContain("Lucy");
    expect(whole).toContain("Mina");

    // Van Helsing does not arrive for another two hundred pages, and a reader
    // in chapter one must not be told he exists.
    const early = buildCharacterIndex(chunks, 120).map((entry) => entry.name);
    expect(early).not.toContain("Van Helsing");
    // Mina, by contrast, is named in Harker's journal on the first day — the
    // index is reporting the book, not guessing at it.
    expect(early).toContain("Mina");
  });
});
