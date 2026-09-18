import { describe, expect, it } from "vitest";

import { parseBookFile } from "./book-import";
import { parseMarkdownBook } from "./markdown-book";
import { parseInline } from "./markdown-inline";

describe("parseInline", () => {
  it("turns single markers into emphasis and keeps the plain text clean", () => {
    const parsed = parseInline("She was *quite* sure.");
    expect(parsed.text).toBe("She was quite sure.");
    expect(parsed.runs).toEqual([
      { text: "She was " },
      { text: "quite", emphasis: true },
      { text: " sure." },
    ]);
  });

  it("reads double markers as strong", () => {
    expect(parseInline("A **hard** no.").runs).toContainEqual({ text: "hard", strong: true });
  });

  it("handles underscores as well as asterisks", () => {
    expect(parseInline("The _Demeter_ sailed.").runs).toContainEqual({
      text: "Demeter",
      emphasis: true,
    });
  });

  it("leaves snake_case_words alone", () => {
    const parsed = parseInline("The file was named my_long_name today.");
    expect(parsed.text).toBe("The file was named my_long_name today.");
    expect(parsed.runs).toBeUndefined();
  });

  it("does not read arithmetic as emphasis", () => {
    const parsed = parseInline("He counted 5 * 3 * 2 sheep.");
    expect(parsed.text).toBe("He counted 5 * 3 * 2 sheep.");
  });

  it("keeps a link's words and drops its target", () => {
    expect(parseInline("See [the letter](https://example.com/x) again.").text).toBe(
      "See the letter again.",
    );
  });

  it("drops images entirely", () => {
    expect(parseInline("![a portrait](portrait.jpg)Then she spoke.").text).toBe("Then she spoke.");
  });

  it("respects an escaped asterisk", () => {
    expect(parseInline("A literal \\*star\\* here.").text).toBe("A literal *star* here.");
  });

  it("adds no runs when there is no formatting", () => {
    expect(parseInline("Nothing special at all.").runs).toBeUndefined();
  });
});

const NOVEL = `---
title: The Demeter
author: A. Nobody
---

# The Demeter

## Chapter One

The ship left harbour at dawn. She watched it go, and thought *this is the last
of it*.

### A later hour

The wind rose.

> 5 July. — We are out of sight of land.
> Nothing has happened.

---

Something happened.

## Chapter Two

The end.`;

describe("parseMarkdownBook", () => {
  const book = parseMarkdownBook(NOVEL, "fallback");

  it("takes the title and author from front matter", () => {
    expect(book.title).toBe("The Demeter");
    expect(book.author).toBe("A. Nobody");
  });

  it("does not leave the front matter in the text", () => {
    const allText = book.chapters.flatMap((c) => c.blocks.map((b) => b.text)).join(" ");
    expect(allText).not.toContain("title:");
    expect(allText).not.toContain("---");
  });

  it("splits chapters on the shallowest heading level used", () => {
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["Chapter One", "Chapter Two"]);
  });

  it("keeps a deeper heading as text instead of starting a chapter", () => {
    const texts = book.chapters[0].blocks.map((block) => block.text);
    expect(texts).toContain("A later hour");
  });

  it("rejoins a soft-wrapped paragraph and keeps its italics", () => {
    const paragraph = book.chapters[0].blocks.find((block) => block.text.startsWith("The ship"));
    expect(paragraph?.text).toBe(
      "The ship left harbour at dawn. She watched it go, and thought this is the last of it.",
    );
    expect(paragraph?.runs).toContainEqual({ text: "this is the last of it", emphasis: true });
  });

  it("reads a blockquote as a quote block, markers removed", () => {
    const quote = book.chapters[0].blocks.find((block) => block.kind === "quote");
    expect(quote?.text).toBe("5 July. — We are out of sight of land. Nothing has happened.");
  });

  it("reads a rule on its own as a scene break", () => {
    expect(book.chapters[0].blocks.some((block) => block.kind === "sceneBreak")).toBe(true);
  });

  it("leaves no markup in the text that gets read, counted or indexed", () => {
    // The scene break's own text is the "* * *" glyph we draw, so it is the
    // one block allowed to contain a star.
    const prose = book.chapters
      .flatMap((chapter) => chapter.blocks)
      .filter((block) => block.kind !== "sceneBreak")
      .map((block) => block.text)
      .join(" ");
    expect(prose).not.toContain("*");
    expect(prose).not.toContain("#");
    expect(prose).not.toContain(">");
  });

  it("reads a dashed underline as a heading, not a scene break", () => {
    const setext = parseMarkdownBook("Chapter One\n-----------\n\nProse follows.", "x");
    expect(setext.chapters[0].title).toBe("Chapter One");
  });

  it("falls back to the plain-text heuristics when there are no headings", () => {
    const bare = parseMarkdownBook("CHAPTER I\n\nSome prose.\n\nCHAPTER II\n\nMore prose.", "x");
    expect(bare.chapters).toHaveLength(2);
  });
});

describe("parseBookFile", () => {
  it("routes .md to the Markdown parser", () => {
    const book = parseBookFile("novel.md", "## One\n\nA *word*.");
    expect(book.chapters[0].blocks[1].runs).toBeDefined();
  });

  it("routes plain .txt to the plain-text parser", () => {
    const book = parseBookFile("novel.txt", "Just prose, with an * in it.");
    expect(book.chapters[0].blocks[0].text).toContain("*");
  });

  it("notices Markdown wearing a .txt extension", () => {
    // Writing apps export Markdown as .txt all the time, and reading
    // "## Chapter Two" as a line of prose is worse than the reverse.
    const book = parseBookFile("novel.txt", "## Chapter Two\n\nThe prose of the chapter.");
    expect(book.chapters[0].title).toBe("Chapter Two");
  });

  it("uses the file name as the title when nothing else says", () => {
    expect(parseBookFile("my-novel.md", "Some prose here.").title).toBe("my-novel");
  });
});
