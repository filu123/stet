import { describe, expect, it } from "vitest";

import { buildChunks } from "./chunker";
import {
  bookProgress,
  clampChunkIndex,
  formatDuration,
  minutesFor,
  nextBreakLabel,
  updatePace,
  wordsToNextBreak,
} from "./reading-position";
import type { BookBlock } from "../types";

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");
const paragraph = (text: string): BookBlock => ({ kind: "paragraph", text });

const chunks = buildChunks([
  {
    title: null,
    blocks: [
      paragraph(words(50)),
      paragraph(words(50)),
      { kind: "sceneBreak", text: "* * *" },
      paragraph(words(50)),
      paragraph(words(50)),
    ],
  },
]);

describe("bookProgress", () => {
  it("runs from part-way to complete", () => {
    expect(bookProgress(chunks, 0)).toBeGreaterThan(0);
    expect(bookProgress(chunks, 0)).toBeLessThan(1);
    expect(bookProgress(chunks, chunks.length - 1)).toBe(1);
  });

  it("survives an out-of-range page", () => {
    expect(bookProgress(chunks, 9999)).toBe(1);
    expect(bookProgress([], 3)).toBe(0);
  });
});

describe("clampChunkIndex", () => {
  it("keeps a position inside the book", () => {
    expect(clampChunkIndex(chunks, -5)).toBe(0);
    expect(clampChunkIndex(chunks, 9999)).toBe(chunks.length - 1);
    expect(clampChunkIndex(chunks, Number.NaN)).toBe(0);
  });
});

describe("wordsToNextBreak", () => {
  it("measures to the end of the scene when one is coming", () => {
    const next = wordsToNextBreak(chunks, 0);
    expect(next?.kind).toBe("scene");
    expect(next?.words).toBeGreaterThan(0);
  });

  it("falls back to the chapter once the last scene has passed", () => {
    const sceneEnd = chunks.findIndex((chunk) => chunk.endsScene);
    expect(wordsToNextBreak(chunks, sceneEnd + 1)?.kind).toBe("chapter");
  });

  it("returns nothing when the text just ends", () => {
    const open = buildChunks([{ title: null, blocks: [paragraph(words(20))] }]);
    open[0].endsChapter = false;
    expect(wordsToNextBreak(open, 0)).toBeNull();
  });

  it("offers a manufactured pause when the author left no break for ages", () => {
    // 40 paragraphs, no scene break: a stretch a real novel produces often.
    const long = buildChunks([
      { title: null, blocks: Array.from({ length: 40 }, () => paragraph(words(50))) },
    ]);
    const next = wordsToNextBreak(long, 0);
    expect(next?.kind).toBe("pause");
    expect(next?.words).toBeLessThan(1200);
    expect(nextBreakLabel(long, 0, 220)).toContain("a good place to stop");
  });
});

describe("updatePace", () => {
  it("takes the first plausible sample as the starting pace", () => {
    expect(updatePace(null, 200, 60_000)).toBeCloseTo(200);
  });

  it("ignores a tab left open overnight", () => {
    expect(updatePace(250, 60, 8 * 60 * 60 * 1000)).toBe(250);
  });

  it("ignores someone flicking through to find their place", () => {
    expect(updatePace(250, 500, 1_000)).toBe(250);
  });

  it("moves gradually rather than jumping to the newest sample", () => {
    const updated = updatePace(200, 300, 60_000)!;
    expect(updated).toBeGreaterThan(200);
    expect(updated).toBeLessThan(240);
  });

  it("keeps the old pace when there is nothing to learn", () => {
    expect(updatePace(200, 0, 5_000)).toBe(200);
  });
});

describe("formatDuration", () => {
  it("never shows a bare decimal", () => {
    expect(formatDuration(0.4)).toBe("under a minute");
    expect(formatDuration(3.4)).toBe("3 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(70)).toBe("1 hr 10 min");
  });
});

describe("minutesFor / nextBreakLabel", () => {
  it("uses a default pace until the reader has one", () => {
    expect(minutesFor(220, null)).toBeCloseTo(1);
  });

  it("phrases the offer in terms of the next break", () => {
    expect(nextBreakLabel(chunks, 0, 220)).toContain("to the end of this scene");
  });
});
