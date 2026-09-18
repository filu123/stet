import type { BookBlock, ParsedBook } from "../types";

import { countBookWords, groupIntoChapters } from "./book-structure";
import { parseInline } from "./markdown-inline";
import { looksLikeHeading } from "./plain-text-book";

/**
 * Markdown into the same book shape.
 *
 * Worth doing properly rather than reading a `.md` as plain text: Markdown
 * states outright what the plain-text parser has to guess at. `## Chapter Two`
 * is a chapter, full stop — no heuristics about capitals and roman numerals —
 * and `*she thought*` is italics rather than a pair of stray asterisks in the
 * middle of a sentence.
 */

/** `***`, `---`, `___` on their own — Markdown's scene break. */
const THEMATIC_BREAK = /^ {0,3}([*\-_])[ \t]*(?:\1[ \t]*){2,}$/;
const ATX_HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)\s*$/;
const BLOCKQUOTE_LINE = /^ {0,3}>\s?/;
const LIST_MARKER = /^\s{0,6}(?:[-*+]|\d{1,3}[.)])\s+/;
const FENCE = /^ {0,3}(?:```|~~~)/;

interface MarkdownBlock extends BookBlock {
  /** 1–6 for headings, so the chapter level can be worked out afterwards. */
  level?: number;
}

export function parseMarkdownBook(raw: string, fallbackTitle: string): ParsedBook {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const { body, frontMatter } = stripFrontMatter(normalized);

  const blocks = toBlocks(body);
  const { title, author, remaining } = extractMetadata(blocks, frontMatter, fallbackTitle);
  const chapters = groupIntoChapters(withChapterHeadings(remaining));

  return { title, author, chapters, wordCount: countBookWords(chapters) };
}

/** YAML front matter, as every static-site export writes it. */
function stripFrontMatter(text: string): { body: string; frontMatter: Map<string, string> } {
  const frontMatter = new Map<string, string>();
  if (!text.startsWith("---\n")) return { body: text, frontMatter };

  const end = text.indexOf("\n---", 4);
  if (end === -1) return { body: text, frontMatter };

  for (const line of text.slice(4, end).split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && value) frontMatter.set(key, value);
  }

  return { body: text.slice(text.indexOf("\n", end + 1) + 1), frontMatter };
}

function toBlocks(body: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];

  for (const raw of body.split(/\n[ \t]*\n+/)) {
    const piece = raw.replace(/\s+$/, "");
    if (!piece.trim()) continue;
    const lines = piece.split("\n").filter((line) => line.trim());

    if (lines.length === 1 && THEMATIC_BREAK.test(lines[0])) {
      blocks.push({ kind: "sceneBreak", text: "* * *" });
      continue;
    }

    // A row of dashes under text is a heading; the same row alone is a scene
    // break. Splitting on blank lines is what keeps the two apart.
    if (lines.length >= 2 && SETEXT_UNDERLINE.test(lines[lines.length - 1])) {
      const level = lines[lines.length - 1].trim().startsWith("=") ? 1 : 2;
      blocks.push(heading(lines.slice(0, -1).join(" "), level));
      continue;
    }

    if (lines.every((line) => BLOCKQUOTE_LINE.test(line))) {
      const text = lines.map((line) => line.replace(BLOCKQUOTE_LINE, "")).join(" ");
      blocks.push({ kind: "quote", ...parseInline(text) });
      continue;
    }

    if (FENCE.test(lines[0])) {
      // Nothing in a novel, but dropping the contents would lose text.
      const inner = lines.filter((line) => !FENCE.test(line)).join(" ");
      if (inner.trim()) blocks.push({ kind: "paragraph", text: inner });
      continue;
    }

    // Each list item reads as its own short paragraph.
    if (lines.every((line) => LIST_MARKER.test(line))) {
      for (const line of lines) {
        blocks.push({ kind: "paragraph", ...parseInline(line.replace(LIST_MARKER, "")) });
      }
      continue;
    }

    let paragraph: string[] = [];
    const flushParagraph = () => {
      if (paragraph.length === 0) return;
      blocks.push({ kind: "paragraph", ...parseInline(paragraph.join(" ")) });
      paragraph = [];
    };

    for (const line of lines) {
      const atx = line.match(ATX_HEADING);
      if (atx) {
        flushParagraph();
        blocks.push(heading(atx[2], atx[1].length));
        continue;
      }
      paragraph.push(line.trim());
    }
    flushParagraph();
  }

  return blocks;
}

function heading(text: string, level: number): MarkdownBlock {
  return { kind: "heading", level, ...parseInline(text.trim()) };
}

/**
 * Front matter wins; failing that, a single `# Title` at the very top is the
 * book's name rather than its first chapter.
 */
function extractMetadata(
  blocks: MarkdownBlock[],
  frontMatter: Map<string, string>,
  fallbackTitle: string,
): { title: string; author: string | null; remaining: MarkdownBlock[] } {
  const author = frontMatter.get("author") ?? null;
  const first = blocks[0];
  const isLoneTitle =
    first?.kind === "heading" &&
    first.level === 1 &&
    !blocks.slice(1).some((block) => block.kind === "heading" && block.level === 1);

  if (frontMatter.has("title")) {
    return {
      title: frontMatter.get("title")!,
      author,
      remaining: isLoneTitle ? blocks.slice(1) : blocks,
    };
  }
  if (isLoneTitle) return { title: first.text, author, remaining: blocks.slice(1) };
  return { title: fallbackTitle, author, remaining: blocks };
}

/**
 * Decides which headings start chapters.
 *
 * The shallowest heading level in the file is the chapter level, whatever it
 * happens to be — some exports use `#` per chapter, some `##`, some `###`.
 * Deeper ones become part of the text so a section title is not mistaken for
 * a new chapter. When there are no headings at all, the plain-text heuristics
 * get a turn: a Markdown file can still be a novel typed as bare paragraphs.
 */
function withChapterHeadings(blocks: MarkdownBlock[]): BookBlock[] {
  const levels = blocks
    .filter((block) => block.kind === "heading")
    .map((block) => block.level ?? 6);

  if (levels.length === 0) {
    return blocks.map((block) =>
      block.kind === "paragraph" && !block.runs && looksLikeHeading(block.text)
        ? { kind: "heading", text: block.text }
        : toBookBlock(block),
    );
  }

  const chapterLevel = Math.min(...levels);
  return blocks.map((block) =>
    block.kind === "heading" && (block.level ?? 6) > chapterLevel
      ? { ...toBookBlock(block), kind: "paragraph" as const }
      : toBookBlock(block),
  );
}

/** Drops the heading level, which was only ever needed to group chapters. */
function toBookBlock(block: MarkdownBlock): BookBlock {
  return block.runs
    ? { kind: block.kind, text: block.text, runs: block.runs }
    : { kind: block.kind, text: block.text };
}
