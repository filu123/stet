import { describe, expect, it } from "vitest";

import { buildChunks } from "./chunker";
import { popPageStep, previousPageStart, wordsBetween, type PageStep } from "./page-fill";
import type { BookBlock } from "../types";

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");
const paragraph = (text: string): BookBlock => ({ kind: "paragraph", text });

// Twenty paragraphs of fifty words: chunks of roughly fifty words each.
const chunks = buildChunks([
  { title: null, blocks: Array.from({ length: 20 }, () => paragraph(words(50))) },
]);

describe("previousPageStart", () => {
  it("walks back about a page's worth of words", () => {
    const start = previousPageStart(chunks, 10, 150);
    expect(start).toBeLessThan(10);
    expect(wordsBetween(chunks, start, 10)).toBeGreaterThanOrEqual(150);
    // …but not wildly more than a page.
    expect(wordsBetween(chunks, start, 10)).toBeLessThan(150 + 60);
  });

  it("stops at the beginning of the book", () => {
    expect(previousPageStart(chunks, 1, 5000)).toBe(0);
    expect(previousPageStart(chunks, 0, 150)).toBe(0);
  });

  it("always moves at least one chunk, even with a page of nothing", () => {
    // A page that measured as zero words must not leave the reader stuck.
    expect(previousPageStart(chunks, 5, 0)).toBe(4);
  });

  it("goes further back when the page holds more", () => {
    const small = previousPageStart(chunks, 15, 100);
    const large = previousPageStart(chunks, 15, 400);
    expect(large).toBeLessThan(small);
  });
});

describe("popPageStep", () => {
  it("returns the page turned forward from", () => {
    const history: PageStep[] = [{ from: 4, to: 9 }];
    expect(popPageStep(history, 9)).toBe(4);
    expect(history).toHaveLength(0);
  });

  it("refuses an entry that does not describe where the reader is", () => {
    // Jumped here from the contents: the stack is about somewhere else.
    const history: PageStep[] = [{ from: 4, to: 9 }];
    expect(popPageStep(history, 40)).toBeNull();
    expect(history).toHaveLength(1);
  });

  it("has nothing to offer on the first page", () => {
    expect(popPageStep([], 0)).toBeNull();
  });

  it("unwinds several pages in order", () => {
    const history: PageStep[] = [
      { from: 0, to: 5 },
      { from: 5, to: 11 },
    ];
    expect(popPageStep(history, 11)).toBe(5);
    expect(popPageStep(history, 5)).toBe(0);
    expect(popPageStep(history, 0)).toBeNull();
  });
});

describe("wordsBetween", () => {
  it("adds up a run of chunks", () => {
    expect(wordsBetween(chunks, 0, 2)).toBe(chunks[0].wordCount + chunks[1].wordCount);
  });

  it("survives a range that runs off either end", () => {
    expect(wordsBetween(chunks, -5, 1)).toBe(chunks[0].wordCount);
    expect(wordsBetween(chunks, chunks.length - 1, 9999)).toBe(chunks.at(-1)!.wordCount);
    expect(wordsBetween(chunks, 5, 5)).toBe(0);
  });
});
