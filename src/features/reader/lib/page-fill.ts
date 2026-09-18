import type { ReadingChunk } from "../types";

/**
 * Page mode's arithmetic: no focus aid, just as much of the book as the screen
 * holds, turned a page at a time.
 *
 * Pages are built forwards by measurement — whatever fits, fits — so a page is
 * always exactly right from wherever it starts. Only going *backwards* needs
 * arithmetic, because the page before this one was never laid out.
 *
 * Pages break between chunks, which means between paragraphs. A page may end
 * with a little room to spare rather than splitting a paragraph across the
 * fold; for a reader who loses their place easily that is the better trade.
 */

/**
 * Where the page before `chunkIndex` most likely began.
 *
 * Estimated from how many words the current page holds, which is a stable
 * number at a given size. Being a chunk out costs nothing: the page is laid
 * out from wherever it starts, so it is never broken, only slightly shorter or
 * longer than it was the first time.
 */
export function previousPageStart(
  chunks: ReadingChunk[],
  chunkIndex: number,
  wordsPerPage: number,
): number {
  if (chunkIndex <= 0) return 0;
  const budget = Math.max(1, wordsPerPage);

  let words = 0;
  let start = chunkIndex;
  for (let index = chunkIndex - 1; index >= 0; index--) {
    words += chunks[index].wordCount;
    if (words > budget && start < chunkIndex) break;
    start = index;
  }
  return start;
}

/** Total words across a run of chunks — what a page's worth is measured in. */
export function wordsBetween(chunks: ReadingChunk[], from: number, to: number): number {
  let words = 0;
  for (let index = Math.max(0, from); index < Math.min(chunks.length, to); index++) {
    words += chunks[index].wordCount;
  }
  return words;
}

/**
 * A page the reader turned forward from, kept so going back lands exactly
 * where they were rather than on an estimate.
 *
 * It carries where it went as well as where it came from: after a jump from
 * the contents or the scrubber the top of the stack no longer describes this
 * page, and an entry that cannot prove it does is discarded.
 */
export interface PageStep {
  from: number;
  to: number;
}

export function popPageStep(history: PageStep[], chunkIndex: number): number | null {
  const last = history[history.length - 1];
  if (!last || last.to !== chunkIndex) return null;
  history.pop();
  return last.from;
}
