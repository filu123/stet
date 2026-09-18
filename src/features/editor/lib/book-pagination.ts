/**
 * Page math for book mode.
 *
 * Book mode reuses the page-view plugin's measured page breaks, configured
 * with no gray band and no top padding. Every sheet is then exactly
 * `pageHeight` tall in the rendered document, so turning a page is a single
 * translate and page N always starts at `N * pageHeight` — no per-page
 * bookkeeping, no drift.
 */

/** Pages = breaks + 1; an empty document is still one (blank) page. */
export function bookPageCount(pageBreakCount: number): number {
  return Math.max(1, pageBreakCount + 1);
}

/** Keeps a page number inside the document as it repaginates while you edit. */
export function clampPageIndex(index: number, pageCount: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), Math.max(0, pageCount - 1));
}

/** How far the sheet stack is pushed up to bring `index` into the window. */
export function pageOffset(index: number, pageHeight: number): number {
  return index * pageHeight;
}

/**
 * Which page a document position falls on.
 *
 * `pageStartPositions` are the doc positions of the page breaks, ascending —
 * a break sits *before* the block it pushed down, so a cursor exactly at one
 * belongs to the new page.
 */
export function pageIndexForDocPos(pageStartPositions: number[], docPos: number): number {
  let index = 0;
  for (const start of pageStartPositions) {
    if (start > docPos) break;
    index += 1;
  }
  return index;
}

/** Reading progress, 0–1, for the scrubber. Single-page documents read as 0. */
export function readingProgress(index: number, pageCount: number): number {
  if (pageCount <= 1) return 0;
  return clampPageIndex(index, pageCount) / (pageCount - 1);
}
