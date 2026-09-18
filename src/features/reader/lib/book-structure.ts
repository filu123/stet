import type { BookBlock, BookChapter } from "../types";

import { countWords } from "./text";

/** Shared shaping, so plain text and Markdown produce identical books. */

export function groupIntoChapters(blocks: BookBlock[]): BookChapter[] {
  const chapters: BookChapter[] = [];
  let current: BookChapter | null = null;

  for (const block of blocks) {
    if (block.kind === "heading") {
      // A number on one line and its title on the next is one chapter with a
      // two-part name, not an empty chapter followed by a real one.
      if (current && current.blocks.every((existing) => existing.kind === "heading")) {
        current.title = current.title ? `${current.title} — ${block.text}` : block.text;
        current.blocks.push(block);
        continue;
      }
      current = { title: block.text, blocks: [block] };
      chapters.push(current);
      continue;
    }
    if (!current) {
      // Everything before the first heading is front matter, kept so the book
      // opens where the author meant it to.
      current = { title: null, blocks: [] };
      chapters.push(current);
    }
    current.blocks.push(block);
  }

  // A heading with nothing under it is a part divider, not a chapter.
  return chapters.filter((chapter) => chapter.blocks.some((block) => block.kind !== "heading"));
}

/**
 * Dividers are not words anyone reads, and counting them would quietly inflate
 * every progress bar and time estimate in the app.
 */
export function countBookWords(chapters: BookChapter[]): number {
  return chapters.reduce(
    (total, chapter) =>
      total +
      chapter.blocks.reduce(
        (sum, block) => (block.kind === "sceneBreak" ? sum : sum + countWords(block.text)),
        0,
      ),
    0,
  );
}
