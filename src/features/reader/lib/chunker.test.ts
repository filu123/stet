import { describe, expect, it } from "vitest";

import { CHUNK_SIZES, buildChunks } from "./chunker";
import type { BookBlock, BookChapter } from "../types";

const words = (count: number, word = "word") => Array.from({ length: count }, () => word).join(" ");

const paragraph = (text: string): BookBlock => ({ kind: "paragraph", text });
const chapter = (title: string | null, blocks: BookBlock[]): BookChapter => ({ title, blocks });

describe("buildChunks", () => {
  it("groups short dialogue lines instead of one tap per line", () => {
    const lines = ['"Yes."', '"No."', '"Are you sure?"', '"Quite sure," he said.'];
    const chunks = buildChunks([chapter(null, lines.map(paragraph))]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].blocks).toHaveLength(4);
  });

  it("splits a paragraph that is too long for one screen at a sentence seam", () => {
    const long = `${words(60)}. ${words(60)}. ${words(60)}.`;
    const chunks = buildChunks([chapter(null, [paragraph(long)])], CHUNK_SIZES.medium);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.wordCount).toBeLessThanOrEqual(CHUNK_SIZES.medium.max + 1);
    }
  });

  it("does not split 'Mr. Harker' into two chunks", () => {
    const long = `${words(70)} for Mr. Harker to consider. ${words(70)}.`;
    const chunks = buildChunks([chapter(null, [paragraph(long)])], CHUNK_SIZES.medium);
    const withTitle = chunks.find((chunk) => chunk.blocks[0].text.includes("Mr."));
    expect(withTitle?.blocks[0].text).toContain("Mr. Harker");
  });

  it("ends a chunk on a scene break and marks it", () => {
    const chunks = buildChunks([
      chapter(null, [
        paragraph("The scene ends here."),
        { kind: "sceneBreak", text: "* * *" },
        paragraph("A new scene begins."),
      ]),
    ]);
    expect(chunks[0].endsScene).toBe(true);
    expect(chunks[0].blocks.at(-1)?.kind).toBe("sceneBreak");
    expect(chunks[1].endsScene).toBe(false);
  });

  it("gives a chapter heading its own beat", () => {
    const chunks = buildChunks([
      chapter("CHAPTER I", [{ kind: "heading", text: "CHAPTER I" }, paragraph(words(40))]),
    ]);
    expect(chunks[0].blocks).toEqual([
      { kind: "heading", text: "CHAPTER I", blockIndex: 0, blockOffset: 0 },
    ]);
    expect(chunks[0].startsChapter).toBe(true);
    expect(chunks[1].startsChapter).toBe(false);
  });

  it("records where each block came from, so a highlight can be anchored", () => {
    const long = `${words(60)}. ${words(60)}.`;
    const chunks = buildChunks([
      chapter(null, [paragraph("First paragraph."), paragraph(long)]),
    ]);
    expect(chunks[0].blocks[0]).toMatchObject({ blockIndex: 0, blockOffset: 0 });

    // The long paragraph is block 1, split into pieces that each know how far
    // into the original they start.
    const pieces = chunks.flatMap((chunk) => chunk.blocks).filter((b) => b.blockIndex === 1);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces[0].blockOffset).toBe(0);
    expect(pieces[1].blockOffset).toBeGreaterThan(0);
    expect(long.slice(pieces[1].blockOffset)).toBe(pieces[1].text);
  });

  it("marks the last chunk of every chapter", () => {
    const chunks = buildChunks([
      chapter(null, [paragraph(words(30)), paragraph(words(30))]),
      chapter(null, [paragraph(words(30))]),
    ]);
    const endings = chunks.filter((chunk) => chunk.endsChapter);
    expect(endings).toHaveLength(2);
    expect(endings.at(-1)).toBe(chunks.at(-1));
  });

  it("numbers chunks and accumulates the words before each one", () => {
    const chunks = buildChunks([chapter(null, [paragraph(words(50)), paragraph(words(50))])]);
    chunks.forEach((chunk, index) => expect(chunk.index).toBe(index));
    expect(chunks[0].wordsBefore).toBe(0);
    expect(chunks[1].wordsBefore).toBe(chunks[0].wordCount);
  });

  it("makes smaller chunks when asked", () => {
    const blocks = Array.from({ length: 10 }, () => paragraph(words(20)));
    const small = buildChunks([chapter(null, blocks)], CHUNK_SIZES.short);
    const large = buildChunks([chapter(null, blocks)], CHUNK_SIZES.long);
    expect(small.length).toBeGreaterThan(large.length);
  });
});
