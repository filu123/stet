import { BLOCK_ATTRIBUTES } from "./selection-anchor";

/**
 * Sweeping a stylus across text to highlight it.
 *
 * A pen drag is not a text selection as far as the browser is concerned — it
 * pans, the way a finger does. So the sweep is built by hand: find the caret
 * under the pen at each end of the stroke and set the document selection
 * between them, which gives the reader the live feedback of watching the text
 * fill in as they sweep.
 *
 * `caretPositionFromPoint` is the standard; WebKit has only ever shipped
 * `caretRangeFromPoint`, and Safari is exactly the browser this has to work in.
 */

interface CaretPoint {
  node: Node;
  offset: number;
}

/**
 * A pen stroke sets the selection programmatically, which fires
 * `selectionchange` like any other. The highlight popover watches that event,
 * and it must not open in the middle of a sweep the pen is about to finish.
 */
let isSweeping = false;

export function beginPenSweep(): void {
  isSweeping = true;
}

export function endPenSweep(): void {
  isSweeping = false;
}

export function isPenSweeping(): boolean {
  return isSweeping;
}

export function caretFromPoint(x: number, y: number): CaretPoint | null {
  if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(x, y);
    return position ? { node: position.offsetNode, offset: position.offset } : null;
  }
  const legacy = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (typeof legacy.caretRangeFromPoint === "function") {
    const range = legacy.caretRangeFromPoint(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }
  return null;
}

/** The paragraph a caret point sits in, if it is in one at all. */
export function blockOf(point: CaretPoint): HTMLElement | null {
  const element =
    point.node.nodeType === Node.ELEMENT_NODE
      ? (point.node as HTMLElement)
      : point.node.parentElement;
  return element?.closest<HTMLElement>(`[${BLOCK_ATTRIBUTES.block}]`) ?? null;
}

/**
 * Paints the selection from where the pen went down to where it is now.
 *
 * A stroke that wanders into the next paragraph is clamped to the end of the
 * one it started in: a highlight is anchored to a single block, and stopping
 * at the paragraph edge is far better than silently dropping the whole sweep.
 */
export function selectStroke(anchor: CaretPoint, head: CaretPoint): boolean {
  const block = blockOf(anchor);
  if (!block) return false;

  const clampedHead = block.contains(head.node) ? head : edgeOf(block, head);
  if (!clampedHead) return false;

  const range = document.createRange();
  try {
    range.setStart(anchor.node, anchor.offset);
    range.setEnd(clampedHead.node, clampedHead.offset);
    // Setting an end before the start collapses the range; the stroke simply
    // went right to left, so swap the ends.
    if (range.collapsed) {
      range.setStart(clampedHead.node, clampedHead.offset);
      range.setEnd(anchor.node, anchor.offset);
    }
  } catch {
    return false;
  }
  if (range.collapsed) return false;

  const selection = window.getSelection();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

/** Whichever end of the block the stroke ran off. */
function edgeOf(block: HTMLElement, head: CaretPoint): CaretPoint | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode();
  if (!first) return null;

  let last = first;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) last = node;

  const isAfter =
    (block.compareDocumentPosition(head.node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  return isAfter
    ? { node: last, offset: last.textContent?.length ?? 0 }
    : { node: first, offset: 0 };
}
