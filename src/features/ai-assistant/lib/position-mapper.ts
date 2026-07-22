import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * Maps between the document's plain text and ProseMirror positions.
 *
 * THE core invariant of the whole AI feature: the text we send to the model is
 * `buildDocumentTextIndex(doc).text`, and every character of it knows its
 * ProseMirror position. Model-quoted text is located in this exact string, so
 * positions can never drift — we never trust offsets from the model.
 *
 * Both plain-text indices and ProseMirror positions count UTF-16 code units,
 * so emoji and other multibyte characters stay aligned by construction.
 */

export interface DocumentTextIndex {
  /** The document as plain text; blocks separated by \n. */
  text: string;
  /**
   * positions[i] = ProseMirror position of text[i].
   * Block-separator characters carry -1 (no position — a match crossing one
   * would span paragraphs and is rejected).
   */
  positions: number[];
}

export function buildDocumentTextIndex(doc: ProseMirrorNode): DocumentTextIndex {
  const chunks: string[] = [];
  const positions: number[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      chunks.push(node.text);
      for (let i = 0; i < node.text.length; i++) {
        positions.push(pos + i);
      }
    } else if (node.isBlock && positions.length > 0 && positions[positions.length - 1] !== -1) {
      chunks.push("\n");
      positions.push(-1);
    }
    return true;
  });

  return { text: chunks.join(""), positions };
}

export interface ResolvedRange {
  from: number;
  to: number;
}

/**
 * Locates the nth occurrence of `quote` in the document text and returns its
 * ProseMirror range. An out-of-range occurrence clamps to the nearest existing
 * one (models tend to overshoot their count); returns null when the quote
 * isn't found at all or crosses a paragraph boundary.
 */
export function resolveQuoteRange(
  index: DocumentTextIndex,
  quote: string,
  occurrence: number,
): ResolvedRange | null {
  if (quote.length === 0) return null;

  const matchStarts: number[] = [];
  let searchFrom = 0;
  while (true) {
    const matchAt = index.text.indexOf(quote, searchFrom);
    if (matchAt === -1) break;
    matchStarts.push(matchAt);
    searchFrom = matchAt + 1;
  }
  if (matchStarts.length === 0) return null;

  const start = matchStarts[Math.min(Math.max(occurrence, 1), matchStarts.length) - 1];
  const charPositions = index.positions.slice(start, start + quote.length);
  if (charPositions.includes(-1)) return null; // crosses a block boundary

  return { from: charPositions[0], to: charPositions[charPositions.length - 1] + 1 };
}
