import type { BookBlock, ParsedBook } from "../types";

import { countBookWords, groupIntoChapters } from "./book-structure";

/**
 * Turns a plain-text novel into chapters and blocks.
 *
 * Aimed at Project Gutenberg, which is where a free, DRM-free, hand-typeset
 * corpus actually lives: its files carry a header we strip, hard-wrapped lines
 * we rejoin, and chapter headings we can recognise. EPUB will produce the same
 * shape later — everything downstream reads `ParsedBook`, not text.
 */

const GUTENBERG_START = /^\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im;
const GUTENBERG_END = /^\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im;

/** A line of stars, dashes or dots: the scene break in a text-only book. */
const SCENE_BREAK = /^[\s*.\-—–_·•+~=#]{1,40}$/;

/** "CHAPTER IV", "Part Two", "PROLOGUE", "XVII." — with or without a title. */
const CHAPTER_HEADING =
  /^\s*(chapter|part|book|canto|act|scene|prologue|epilogue|interlude|section)\b[\s.:—–-]*([^\n]{0,80})$/i;
/**
 * A numeral alone is a heading; a numeral with a title after it needs a
 * separator to prove it. Without that rule "I did not sleep well." reads as
 * chapter one — and a first-person novel is nothing but sentences starting
 * with "I".
 */
const BARE_NUMERAL_HEADING = /^\s*(?:[IVXLCDM]{1,7}|\d{1,3})\s*[.:—–-]?\s*$/;
const NUMBERED_TITLE_HEADING = /^\s*(?:[IVXLCDM]{1,7}|\d{1,3})\s*[.:—–-]+\s*\S[^\n]{0,60}$/;

export function parsePlainTextBook(raw: string, fallbackTitle: string): ParsedBook {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const title = matchMetadata(normalized, "title") ?? fallbackTitle;
  const author = matchMetadata(normalized, "author");

  const chapters = groupIntoChapters(toBlocks(stripGutenbergWrapper(normalized)));
  return { title, author, chapters, wordCount: countBookWords(chapters) };
}

/** Gutenberg's `Title:` / `Author:` lines, which sit above the start marker. */
function matchMetadata(text: string, field: "title" | "author"): string | null {
  const header = text.slice(0, 4000);
  const match = header.match(new RegExp(`^${field}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : null;
}

function stripGutenbergWrapper(text: string): string {
  const start = text.match(GUTENBERG_START);
  const body = start?.index === undefined ? text : text.slice(start.index + start[0].length);
  const end = body.match(GUTENBERG_END);
  return end?.index === undefined ? body : body.slice(0, end.index);
}

/**
 * Paragraphs are separated by blank lines; the line breaks *inside* one are an
 * artefact of a 70-column file and have to go, or every paragraph would wrap
 * twice on a phone.
 */
function toBlocks(body: string): BookBlock[] {
  return body
    .split(/\n[ \t]*\n+/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      if (SCENE_BREAK.test(piece) && /[*.\-—–_·•+~=#]/.test(piece)) {
        return { kind: "sceneBreak", text: "* * *" } as const;
      }
      const text = piece.replace(/\s*\n\s*/g, " ").trim();
      return { kind: looksLikeHeading(piece) ? "heading" : "paragraph", text } as const;
    });
}

/**
 * A heading is a short standalone line. The shouty-caps and bare-numeral cases
 * matter: plenty of books label chapters with nothing but "XIV".
 */
export function looksLikeHeading(piece: string): boolean {
  if (piece.includes("\n")) return false;
  if (piece.length > 90) return false;
  const line = piece.trim();
  if (CHAPTER_HEADING.test(line)) return true;
  if (BARE_NUMERAL_HEADING.test(line) || NUMBERED_TITLE_HEADING.test(line)) return true;
  // ALL CAPS, no sentence punctuation — a title, not a shouted line of dialogue.
  return line.length > 1 && line === line.toUpperCase() && /[A-Z]/.test(line) && !/[.!?,"]/.test(line);
}
