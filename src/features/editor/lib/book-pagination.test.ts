import { describe, expect, it } from "vitest";

import {
  bookPageCount,
  clampPageIndex,
  pageIndexForDocPos,
  pageOffset,
  readingProgress,
} from "./book-pagination";

describe("bookPageCount", () => {
  it("counts one more page than there are breaks", () => {
    expect(bookPageCount(0)).toBe(1);
    expect(bookPageCount(3)).toBe(4);
  });

  it("never reports zero pages for an empty document", () => {
    expect(bookPageCount(-1)).toBe(1);
  });
});

describe("clampPageIndex", () => {
  it("keeps a page inside the document", () => {
    expect(clampPageIndex(-2, 5)).toBe(0);
    expect(clampPageIndex(9, 5)).toBe(4);
    expect(clampPageIndex(2, 5)).toBe(2);
  });

  it("falls back to the first page for junk input", () => {
    expect(clampPageIndex(Number.NaN, 5)).toBe(0);
    expect(clampPageIndex(3, 0)).toBe(0);
  });

  it("truncates the fractional page a scrubber can produce", () => {
    expect(clampPageIndex(2.8, 5)).toBe(2);
  });
});

describe("pageOffset", () => {
  it("stacks pages at exact multiples of the page height", () => {
    expect(pageOffset(0, 800)).toBe(0);
    expect(pageOffset(3, 800)).toBe(2400);
  });
});

describe("pageIndexForDocPos", () => {
  const breaks = [40, 120, 300];

  it("puts positions before the first break on page one", () => {
    expect(pageIndexForDocPos(breaks, 0)).toBe(0);
    expect(pageIndexForDocPos(breaks, 39)).toBe(0);
  });

  it("counts a position exactly on a break as the new page", () => {
    // A break sits before the block it pushed down, so the block itself —
    // and a cursor at its start — belongs to the page that follows.
    expect(pageIndexForDocPos(breaks, 40)).toBe(1);
    expect(pageIndexForDocPos(breaks, 120)).toBe(2);
  });

  it("finds the last page for a position past every break", () => {
    expect(pageIndexForDocPos(breaks, 5000)).toBe(3);
  });

  it("returns the only page when nothing paginates", () => {
    expect(pageIndexForDocPos([], 999)).toBe(0);
  });
});

describe("readingProgress", () => {
  it("runs 0 → 1 across the document", () => {
    expect(readingProgress(0, 5)).toBe(0);
    expect(readingProgress(4, 5)).toBe(1);
    expect(readingProgress(2, 5)).toBe(0.5);
  });

  it("reports no progress in a single-page document", () => {
    expect(readingProgress(0, 1)).toBe(0);
  });
});
