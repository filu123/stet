import type { ParsedBook } from "../types";

import { parseMarkdownBook } from "./markdown-book";
import { parsePlainTextBook } from "./plain-text-book";

/**
 * One door for every kind of file the shelf accepts.
 *
 * EPUB will arrive here too and return the same `ParsedBook` — nothing
 * downstream of this function knows what a book was written in.
 */

export const IMPORTABLE_BOOK_EXTENSIONS = [".txt", ".md", ".markdown", ".text"] as const;

/** For the file picker's `accept`. */
export const IMPORTABLE_BOOK_ACCEPT = ".txt,.text,.md,.markdown,text/plain,text/markdown";

export function parseBookFile(fileName: string, text: string): ParsedBook {
  const title = fileName.replace(/\.[^.]+$/, "");
  return isMarkdown(fileName, text)
    ? parseMarkdownBook(text, title)
    : parsePlainTextBook(text, title);
}

/**
 * Extension first, contents second: plenty of `.txt` files out of a writing
 * app are Markdown in all but name, and reading `## Chapter Two` as a line of
 * prose is worse than the reverse.
 */
function isMarkdown(fileName: string, text: string): boolean {
  if (/\.(md|markdown)$/i.test(fileName)) return true;
  if (!/\.(txt|text)$/i.test(fileName)) return false;

  const head = text.slice(0, 8000);
  if (head.startsWith("---\n")) return true;
  return /^ {0,3}#{1,3}\s+\S/m.test(head) || /(\*\*|__)\S[\s\S]{0,60}?\S\1/.test(head);
}
