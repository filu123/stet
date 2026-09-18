import { describe, expect, it } from "vitest";

import { buildBlockRuns, isWorthHighlighting } from "./highlight-runs";
import type { BookHighlight, ChunkBlock } from "../types";

const YELLOW = "var(--pill-yellow-bg)";
const GREEN = "var(--pill-green-bg)";

const block = (text: string, extra: Partial<ChunkBlock> = {}): ChunkBlock => ({
  kind: "paragraph",
  text,
  blockIndex: 0,
  blockOffset: 0,
  ...extra,
});

const highlight = (start: number, end: number, extra: Partial<BookHighlight> = {}): BookHighlight => ({
  id: `h${start}-${end}`,
  bookId: "b",
  chapterIndex: 0,
  blockIndex: 0,
  start,
  end,
  text: "",
  color: YELLOW,
  createdAt: 1,
  ...extra,
});

describe("buildBlockRuns", () => {
  it("leaves an unmarked block exactly as it was", () => {
    const plain = block("Nothing marked here.");
    expect(buildBlockRuns(plain, [])).toEqual([{ text: "Nothing marked here." }]);
  });

  it("cuts a plain block into before, marked and after", () => {
    const runs = buildBlockRuns(block("The night was dark."), [highlight(4, 9)]);
    expect(runs.map((run) => run.text)).toEqual(["The ", "night", " was dark."]);
    expect(runs[1].highlight).toBe(YELLOW);
    expect(runs[0].highlight).toBeUndefined();
  });

  it("marks across the middle of an italic phrase without losing the italics", () => {
    const formatted = block("She said run now", {
      runs: [{ text: "She said " }, { text: "run now", emphasis: true }],
    });
    const runs = buildBlockRuns(formatted, [highlight(5, 12)]);

    expect(runs.map((run) => run.text).join("")).toBe("She said run now");
    // "run" is both emphasised and highlighted; " now" only emphasised.
    const both = runs.find((run) => run.text === "run");
    expect(both?.emphasis).toBe(true);
    expect(both?.highlight).toBe(YELLOW);
    expect(runs.find((run) => run.text === " now")?.highlight).toBeUndefined();
  });

  it("offsets a highlight into a paragraph that was split across chunks", () => {
    // Second half of a long paragraph: its own text starts 20 characters in.
    const piece = block("the second half here", { blockOffset: 20 });
    const runs = buildBlockRuns(piece, [highlight(24, 30)]);
    expect(runs.find((run) => run.highlight)?.text).toBe("second");
  });

  it("ignores highlights belonging to another block", () => {
    const runs = buildBlockRuns(block("Untouched text."), [highlight(0, 5, { blockIndex: 7 })]);
    expect(runs).toEqual([{ text: "Untouched text." }]);
  });

  it("ignores a highlight that ends before this slice begins", () => {
    const piece = block("later words", { blockOffset: 50 });
    expect(buildBlockRuns(piece, [highlight(0, 10)])).toEqual([{ text: "later words" }]);
  });

  it("gives overlapping highlights to the newer one", () => {
    const runs = buildBlockRuns(block("one two three"), [
      highlight(0, 13, { id: "old", createdAt: 1 }),
      highlight(4, 7, { id: "new", color: GREEN, createdAt: 2 }),
    ]);
    expect(runs.find((run) => run.text === "two")?.highlight).toBe(GREEN);
    expect(runs.find((run) => run.text === "one ")?.highlight).toBe(YELLOW);
  });

  it("carries the highlight's id so tapping it can find it again", () => {
    const runs = buildBlockRuns(block("mark me"), [highlight(0, 4, { id: "abc" })]);
    expect(runs[0].highlightId).toBe("abc");
  });

  it("never drops or duplicates a character", () => {
    const text = "A longer sentence, with punctuation, to slice up.";
    const runs = buildBlockRuns(block(text), [highlight(2, 8), highlight(20, 33)]);
    expect(runs.map((run) => run.text).join("")).toBe(text);
  });
});

describe("buildBlockRuns with the pacer", () => {
  it("lights one word without disturbing the text", () => {
    const runs = buildBlockRuns(block("The night was dark."), [], { start: 4, end: 9 });
    expect(runs.map((run) => run.text).join("")).toBe("The night was dark.");
    expect(runs.find((run) => run.isPaced)?.text).toBe("night");
  });

  it("stacks with a highlight and with italics on the same word", () => {
    const formatted = block("She said run now", {
      runs: [{ text: "She said " }, { text: "run now", emphasis: true }],
    });
    const runs = buildBlockRuns(formatted, [highlight(9, 12)], { start: 9, end: 12 });
    const word = runs.find((run) => run.text === "run");
    expect(word).toMatchObject({ emphasis: true, highlight: YELLOW, isPaced: true });
  });

  it("offsets into a paragraph that was split across chunks", () => {
    const piece = block("the second half here", { blockOffset: 20 });
    const runs = buildBlockRuns(piece, [], { start: 24, end: 30 });
    expect(runs.find((run) => run.isPaced)?.text).toBe("second");
  });

  it("leaves the block alone when the pacer is elsewhere", () => {
    expect(buildBlockRuns(block("Untouched."), [], null)).toEqual([{ text: "Untouched." }]);
  });
});

describe("isWorthHighlighting", () => {
  it("rejects what a mistimed long-press produces", () => {
    expect(isWorthHighlighting("")).toBe(false);
    expect(isWorthHighlighting(" ")).toBe(false);
    expect(isWorthHighlighting("a")).toBe(false);
    expect(isWorthHighlighting("no")).toBe(true);
  });
});
