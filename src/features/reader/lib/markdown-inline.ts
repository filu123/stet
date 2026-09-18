import type { TextRun } from "../types";

/**
 * Inline Markdown, reduced to what a novel uses.
 *
 * Not a CommonMark implementation and not trying to be: a reader needs the
 * *emphasis* (thoughts, stress, ship names, foreign words), the text inside
 * links, and nothing else. Everything unrecognised is left as literal text
 * rather than swallowed — losing a sentence is far worse than showing a stray
 * asterisk.
 */

/** `![alt](src)` — a novel's images are decoration we have nowhere to put. */
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
/** `[text](href)` and `[text][ref]` — keep what was written, drop the target. */
const LINK = /\[([^\]]+)\]\((?:[^)]*)\)|\[([^\]]+)\]\[[^\]]*\]/g;
/** Backticks: fiction uses them for nothing, so keep the contents plainly. */
const CODE = /`([^`]+)`/g;

/**
 * `**strong**` or `*em*`, `__strong__` or `_em_`.
 *
 * The lookarounds are what stop "5 * 3 = 15" and `snake_case` becoming
 * emphasis: a marker has to hug its text on both sides.
 */
const EMPHASIS = /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1|(\*|_)(?=\S)([\s\S]+?)(?<=\S)\3/g;

export interface InlineText {
  text: string;
  /** Omitted entirely when the line had no formatting at all. */
  runs?: TextRun[];
}

export function parseInline(markdown: string): InlineText {
  // Escapes are hidden behind a sentinel for the whole scan and only restored
  // at the end. Unescaping first would turn `\*star\*` into `*star*` and then
  // dutifully italicise it — the one thing the backslash was there to prevent.
  const source = maskEscapes(
    markdown.replace(IMAGE, "").replace(LINK, (_match, inline, reference) => inline ?? reference),
  );

  const runs: TextRun[] = [];
  let plain = "";
  let cursor = 0;
  let hasFormatting = false;

  EMPHASIS.lastIndex = 0;
  for (let match = EMPHASIS.exec(source); match; match = EMPHASIS.exec(source)) {
    const marker = match[1] ?? match[3];
    const inner = match[2] ?? match[4];
    // `_` inside a word is an underscore, not italics.
    if (marker === "_" || marker === "__") {
      const before = source[match.index - 1];
      if (before && /\w/.test(before)) continue;
    }

    if (match.index > cursor) {
      const between = stripCode(source.slice(cursor, match.index));
      runs.push({ text: between });
      plain += between;
    }

    const text = stripCode(inner);
    runs.push(marker.length === 2 ? { text, strong: true } : { text, emphasis: true });
    plain += text;
    hasFormatting = true;
    cursor = match.index + match[0].length;
  }

  const tail = stripCode(source.slice(cursor));
  if (tail) {
    runs.push({ text: tail });
    plain += tail;
  }

  if (!hasFormatting) return { text: unmaskEscapes(plain) };
  return {
    text: unmaskEscapes(plain),
    runs: runs
      .map((run) => ({ ...run, text: unmaskEscapes(run.text) }))
      .filter((run) => run.text),
  };
}

function stripCode(text: string): string {
  return text.replace(CODE, "$1");
}

/**
 * An escaped character is swapped for a private-use codepoint that carries it.
 * The character itself has to vanish: leaving it in place means the emphasis
 * scanner still sees a star where the author wrote a backslash and a star.
 */
const ESCAPE_BASE = 0xe000;

function maskEscapes(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!>])/g, (_match, character: string) =>
    String.fromCharCode(ESCAPE_BASE + character.charCodeAt(0)),
  );
}

function unmaskEscapes(text: string): string {
  return text.replace(/[\uE000-\uE07F]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - ESCAPE_BASE),
  );
}
