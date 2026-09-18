/**
 * A throwaway copy of the page you are turning away from.
 *
 * A real page turn shows two pages at once, but there is only one editor —
 * the page you leave and the page you arrive at are the same DOM at two
 * different offsets. So the outgoing page is copied into an inert clone, the
 * live editor jumps to the new page underneath it, and the clone is the thing
 * that turns. It lives for the length of the animation and is then dropped.
 *
 * The clone carries only the blocks on that one page: copying the whole
 * document would make the browser lay out every page again on every turn.
 */

/** How far off a page boundary a block may sit and still count as on it. */
const EDGE_TOLERANCE = 1;

export function buildPageGhost(
  card: HTMLElement,
  pages: HTMLElement,
  pageIndex: number,
  pageHeight: number,
): HTMLElement | null {
  const liveContent = card.querySelector<HTMLElement>(".tiptap-content");
  if (!liveContent || pageHeight <= 0) return null;

  const pagesTop = pages.getBoundingClientRect().top;
  const pageTop = pageIndex * pageHeight;
  const pageBottom = pageTop + pageHeight;

  // Measure on the live DOM (its layout is already clean), then prune the copy
  // by index — the two agree child for child.
  const liveChildren = Array.from(liveContent.children);
  const visible: { index: number; top: number }[] = [];
  liveChildren.forEach((child, index) => {
    const rect = child.getBoundingClientRect();
    const top = rect.top - pagesTop;
    if (rect.bottom - pagesTop <= pageTop + EDGE_TOLERANCE) return;
    if (top >= pageBottom - EDGE_TOLERANCE) return;
    visible.push({ index, top });
  });
  if (visible.length === 0) return null;

  const clone = card.cloneNode(true) as HTMLElement;
  const clonedContent = clone.querySelector<HTMLElement>(".tiptap-content");
  const clonedPages = clone.querySelector<HTMLElement>(".book-pages");
  if (!clonedContent || !clonedPages) return null;

  const keep = new Set(visible.map((entry) => entry.index));
  Array.from(clonedContent.children).forEach((child, index) => {
    if (!keep.has(index)) child.remove();
  });

  // The copy starts at the top of its window, so the offset the live stack
  // uses is gone. A block that overhangs the boundary (one taller than a page)
  // is pulled back up by the amount it overhangs.
  clonedPages.style.transform = "none";
  const firstVisible = clonedContent.firstElementChild as HTMLElement | null;
  if (firstVisible) {
    const overhang = visible[0].top - pageTop;
    if (Math.abs(overhang) > EDGE_TOLERANCE) firstVisible.style.marginTop = `${overhang}px`;
  }

  // Inert: it must never take a caret, a click or a duplicate id with it.
  clone.querySelectorAll("[contenteditable]").forEach((element) => {
    element.setAttribute("contenteditable", "false");
  });
  clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  clone.setAttribute("aria-hidden", "true");
  clone.inert = true;

  const ghost = document.createElement("div");
  ghost.className = "book-ghost";
  ghost.appendChild(clone);
  return ghost;
}
