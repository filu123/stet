import { describe, expect, it } from "vitest";

import { buildCharacterIndex } from "./character-index";
import { buildChunks } from "./chunker";
import type { BookBlock } from "../types";

const paragraph = (text: string): BookBlock => ({ kind: "paragraph", text });

function indexOf(paragraphs: string[], upto = Number.MAX_SAFE_INTEGER) {
  const chunks = buildChunks([{ title: null, blocks: paragraphs.map(paragraph) }]);
  return buildCharacterIndex(chunks, Math.min(upto, chunks.length - 1));
}

describe("buildCharacterIndex", () => {
  it("finds a repeated name and counts its mentions", () => {
    const entries = indexOf([
      "The count met Jonathan at the door.",
      "Later that evening Jonathan wrote in his journal.",
    ]);
    expect(entries.map((entry) => entry.name)).toContain("Jonathan");
    expect(entries.find((entry) => entry.name === "Jonathan")?.mentions).toBe(2);
  });

  it("keeps a full name together", () => {
    const entries = indexOf([
      "He was introduced to Van Helsing that morning.",
      "Nobody argued with Van Helsing.",
    ]);
    expect(entries.map((entry) => entry.name)).toContain("Van Helsing");
  });

  it("reads a name through its title even at the start of a sentence", () => {
    const entries = indexOf(["Mr. Harker arrived late.", "Mr. Harker said nothing."]);
    expect(entries.map((entry) => entry.name)).toContain("Harker");
  });

  it("ignores a word that only ever opens a sentence", () => {
    const entries = indexOf([
      "Perhaps it was nothing at all.",
      "Perhaps it was something after all.",
    ]);
    expect(entries.map((entry) => entry.name)).not.toContain("Perhaps");
  });

  it("ignores a name mentioned only once", () => {
    const entries = indexOf(["A man called Renfield passed the window and was gone."]);
    expect(entries).toHaveLength(0);
  });

  it("strips the possessive so one character is not two", () => {
    const entries = indexOf(["We read Lucy's letter.", "Then we found Lucy asleep."]);
    const lucy = entries.find((entry) => entry.name === "Lucy");
    expect(lucy?.mentions).toBe(2);
  });

  it("cannot spoil: nothing past the reader's position is indexed", () => {
    // Long enough that each paragraph is its own chunk.
    const filler = Array.from({ length: 60 }, () => "word").join(" ");
    const paragraphs = [
      `The garden was quiet and Mina waited there for Mina's sister. ${filler}.`,
      `The stranger was Dracula, and Dracula had been waiting far longer. ${filler}.`,
    ];
    const chunks = buildChunks([{ title: null, blocks: paragraphs.map(paragraph) }]);
    expect(chunks.length).toBeGreaterThan(1);

    const namesSoFar = buildCharacterIndex(chunks, 0).map((entry) => entry.name);
    expect(namesSoFar).toContain("Mina");
    expect(namesSoFar).not.toContain("Dracula");

    const namesLater = buildCharacterIndex(chunks, chunks.length - 1).map((entry) => entry.name);
    expect(namesLater).toContain("Dracula");
  });

  it("keeps the sentence a character first appears in as evidence", () => {
    const entries = indexOf([
      "The solicitor Jonathan was young and nervous.",
      "Jonathan travelled east.",
    ]);
    const jonathan = entries.find((entry) => entry.name === "Jonathan")!;
    expect(jonathan.firstSentence).toContain("young and nervous");
    expect(jonathan.evidence.length).toBeGreaterThan(0);
    expect(jonathan.firstChunkIndex).toBe(0);
  });

  it("puts the most-mentioned character first", () => {
    const entries = indexOf([
      "Mina wrote to Lucy about Mina and her travels.",
      "Mina waited. Lucy slept.",
    ]);
    expect(entries[0].name).toBe("Mina");
  });
});
