/**
 * Turning what the reader's finger selected into something that can be stored.
 *
 * A DOM Range is made of nodes and offsets inside them, which mean nothing
 * once the page re-renders at a different font size. This walks the text nodes
 * of the enclosing block to convert that into a character offset, and reads
 * the block's identity off the data attributes the renderer puts there.
 */

export interface SelectionAnchor {
  chapterIndex: number;
  blockIndex: number;
  start: number;
  end: number;
  text: string;
}

/** Attributes the rendered blocks carry so a selection can be located. */
export const BLOCK_ATTRIBUTES = {
  chapter: "data-chapter",
  block: "data-block",
  offset: "data-offset",
} as const;

export function readSelectionAnchor(): SelectionAnchor | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const text = selection.toString();
  if (!text.trim()) return null;

  const startBlock = enclosingBlock(range.startContainer);
  const endBlock = enclosingBlock(range.endContainer);
  if (!startBlock || !endBlock) return null;

  // A selection spanning two blocks would need two anchors; the reader almost
  // never means it, and half a highlight is worse than none.
  if (startBlock !== endBlock) return null;

  const chapterIndex = numberAttribute(startBlock, BLOCK_ATTRIBUTES.chapter);
  const blockIndex = numberAttribute(startBlock, BLOCK_ATTRIBUTES.block);
  const blockOffset = numberAttribute(startBlock, BLOCK_ATTRIBUTES.offset);
  if (chapterIndex === null || blockIndex === null) return null;

  const start = offsetWithin(startBlock, range.startContainer, range.startOffset);
  const end = offsetWithin(endBlock, range.endContainer, range.endOffset);
  if (start === null || end === null || end <= start) return null;

  return {
    chapterIndex,
    blockIndex,
    start: start + (blockOffset ?? 0),
    end: end + (blockOffset ?? 0),
    text,
  };
}

function enclosingBlock(node: Node): HTMLElement | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return element?.closest<HTMLElement>(`[${BLOCK_ATTRIBUTES.block}]`) ?? null;
}

function numberAttribute(element: HTMLElement, attribute: string): number | null {
  const raw = element.getAttribute(attribute);
  if (raw === null) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

/** Characters before `(node, offset)` in the element's own text. */
function offsetWithin(element: HTMLElement, node: Node, offset: number): number | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let total = 0;

  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if (current === node) return total + offset;
    total += current.textContent?.length ?? 0;
  }

  // The range can point at the element itself rather than a text node inside
  // it — a triple-tap selecting the whole paragraph, for one.
  return element.contains(node) ? total : null;
}
