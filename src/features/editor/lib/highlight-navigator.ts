import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * Finding highlights so the toolbar can jump to them.
 *
 * "Last" means last in document order — the furthest one down the page, which
 * is where you left off when marking up top-to-bottom. It needs no session
 * state, so it still works after a reload or on another device.
 */

export interface HighlightRange {
  from: number;
  to: number;
}

// A full scan per keystroke would be wasteful; the doc node is immutable, so
// cache by its identity — selection-only changes reuse the result.
const scanCache = new WeakMap<ProseMirrorNode, HighlightRange | null>();

/**
 * The last highlighted passage in the document, or `null` if there are none.
 * Adjacent highlighted text nodes (split by bold, a link, …) count as one
 * passage so the jump lands on the whole thing.
 */
export function findLastHighlightRange(doc: ProseMirrorNode): HighlightRange | null {
  const cached = scanCache.get(doc);
  if (cached !== undefined) return cached;

  let last: HighlightRange | null = null;

  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    if (!node.marks.some((mark) => mark.type.name === "highlight")) return true;

    const from = pos;
    const to = pos + node.nodeSize;
    // Extend the previous run when this node butts right up against it.
    last = last && last.to === from ? { from: last.from, to } : { from, to };
    return true;
  });

  scanCache.set(doc, last);
  return last;
}
