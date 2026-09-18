import { describe, expect, it } from "vitest";

import { parsePlainTextBook } from "./plain-text-book";

const GUTENBERG = `The Project Gutenberg eBook of Dracula

Title: Dracula
Author: Bram Stoker

*** START OF THE PROJECT GUTENBERG EBOOK DRACULA ***

CHAPTER I

JONATHAN HARKER'S JOURNAL

3 May. Bistritz.--Left Munich at 8:35 P. M., on 1st May, arriving
at Vienna early next morning; should have arrived at 6:46, but train
was an hour late.

I had for dinner, or rather supper, a chicken done up some way with
red pepper.

       *       *       *       *       *

I did not sleep well.

CHAPTER II

The second chapter opens here.

*** END OF THE PROJECT GUTENBERG EBOOK DRACULA ***

This trailing licence text must not be read.`;

describe("parsePlainTextBook", () => {
  const book = parsePlainTextBook(GUTENBERG, "untitled.txt");

  it("takes the title and author from the Gutenberg header", () => {
    expect(book.title).toBe("Dracula");
    expect(book.author).toBe("Bram Stoker");
  });

  it("drops everything outside the start and end markers", () => {
    const allText = book.chapters.flatMap((c) => c.blocks.map((b) => b.text)).join(" ");
    expect(allText).not.toContain("licence text");
    expect(allText).not.toContain("Project Gutenberg eBook of");
  });

  it("rejoins the hard-wrapped lines inside a paragraph", () => {
    const paragraph = book.chapters[0].blocks.find((block) => block.text.startsWith("3 May"));
    expect(paragraph?.text).toContain("arriving at Vienna");
    expect(paragraph?.text).not.toContain("\n");
  });

  it("splits on chapter headings", () => {
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[1].title).toBe("CHAPTER II");
  });

  it("joins a chapter number and the title under it into one chapter", () => {
    expect(book.chapters[0].title).toBe("CHAPTER I — JONATHAN HARKER'S JOURNAL");
    expect(book.chapters[0].blocks.some((block) => block.text.startsWith("3 May"))).toBe(true);
  });

  it("recognises a line of stars as a scene break", () => {
    const kinds = book.chapters[0].blocks.map((block) => block.kind);
    expect(kinds).toContain("sceneBreak");
  });

  it("counts the words of the body only", () => {
    expect(book.wordCount).toBeGreaterThan(40);
    expect(book.wordCount).toBeLessThan(90);
  });

  it("falls back to the file name when there is no header", () => {
    const plain = parsePlainTextBook("Just a paragraph of text.", "notes.txt");
    expect(plain.title).toBe("notes.txt");
    expect(plain.chapters).toHaveLength(1);
    expect(plain.chapters[0].title).toBeNull();
  });

  it("keeps a bare roman numeral as a chapter heading", () => {
    const book = parsePlainTextBook("XIV\n\nSome prose follows the numeral.", "x.txt");
    expect(book.chapters[0].title).toBe("XIV");
  });

  it("takes a numeral with a separator and a title", () => {
    const book = parsePlainTextBook("IV. The Journey\n\nSome prose.", "x.txt");
    expect(book.chapters[0].title).toBe("IV. The Journey");
  });

  it("does not read a first-person sentence as chapter one", () => {
    // "I did not sleep well." begins with a roman numeral; a journal novel is
    // made of such sentences and each one would start a chapter.
    const book = parsePlainTextBook("I did not sleep well.\n\nI rose at dawn.", "x.txt");
    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0].title).toBeNull();
    expect(book.chapters[0].blocks.every((block) => block.kind === "paragraph")).toBe(true);
  });
});
