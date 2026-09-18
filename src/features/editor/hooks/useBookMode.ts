"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { Editor } from "@tiptap/react";

import { useBookModeStore } from "@/stores/book-mode-store";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";

import {
  PAGE_GAP_HEIGHT,
  PAPER_CONTENT_HEIGHTS,
  getPageBreakPositions,
  setPageView,
} from "../extensions/page-view";
import {
  bookPageCount,
  clampPageIndex,
  pageIndexForDocPos,
  pageOffset,
} from "../lib/book-pagination";
import { buildPageGhost } from "../lib/page-ghost";

/**
 * Book mode, driven from the page-view plugin.
 *
 * The trick is that nothing new paginates: the plugin already measures where
 * content crosses a page boundary, so book mode just reconfigures it with a
 * screen-sized page, no gap and no top padding. Every sheet is then exactly
 * one window tall, and turning a page is one translate of the *same* editor —
 * which is why highlighting, notes, the pen and every AI action keep working
 * untouched.
 */

/**
 * The turn itself: hinged on the spine at the left edge, lifting towards you
 * and over. Past 90° the page faces away and `backface-visibility` retires it,
 * exactly as paper disappears as it goes over.
 *
 * Played forwards by the copy of the page you are leaving, and in reverse by
 * the page arriving when you turn back — one motion, described once.
 */
const TURN_MS = 420;
const TURN_EASING = "cubic-bezier(0.42, 0.02, 0.3, 1)";
const TURN_FRAMES: Keyframe[] = [
  { transform: "rotateY(0deg)", boxShadow: "0 0 0 rgba(0, 0, 0, 0)" },
  { offset: 0.35, boxShadow: "24px 0 54px rgba(0, 0, 0, 0.28)" },
  { transform: "rotateY(-180deg)", boxShadow: "4px 0 24px rgba(0, 0, 0, 0.12)" },
];

/** Swipe thresholds — deliberately strict so long-press selection still wins. */
const SWIPE_MIN_PX = 60;
const SWIPE_MAX_MS = 600;
const SWIPE_MAX_SLOPE = 0.6;
/** How long after a swipe the click it generates is still ignored. */
const SWIPE_CLICK_GRACE_MS = 500;

/** Shared empty list — a stable identity keeps effects from re-running. */
const NO_BREAKS: number[] = [];

export interface BookModeController {
  isBookMode: boolean;
  pageIndex: number;
  pageCount: number;
  /** Wraps the flowing content; measured to size a page. */
  attachBody: (element: HTMLDivElement | null) => void;
  /** The one-page window the sheet stack is translated inside. */
  attachViewport: (element: HTMLDivElement | null) => void;
  /** Empty layer the turning copy of the outgoing page is mounted into. */
  attachGhostLayer: (element: HTMLDivElement | null) => void;
  /** Inline styles for the window and the stack (no-ops outside book mode). */
  viewportStyle: { height?: string } | undefined;
  pagesStyle: { transform?: string } | undefined;
  turnPage: (direction: 1 | -1) => void;
  goToPage: (index: number, options?: { animate?: boolean }) => void;
  stageProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
  };
}

export function useBookMode(editor: Editor | null): BookModeController {
  const isBookMode = useBookModeStore((state) => state.isBookMode);
  const { pageLayout, paperSize } = useUiPreferencesStore();

  const [pageHeight, setPageHeight] = useState(0);
  const [measuredBreaks, setMeasuredBreaks] = useState<number[]>(NO_BREAKS);
  const [pageIndex, setPageIndex] = useState(0);

  // Outside book mode nothing is paginated, so the document is one page.
  const pageBreaks = isBookMode ? measuredBreaks : NO_BREAKS;

  const bodyElementRef = useRef<HTMLDivElement | null>(null);
  const viewportElementRef = useRef<HTMLDivElement | null>(null);
  // Reading refs instead of state keeps the turn/gesture callbacks stable and
  // free of stale closures — they fire from listeners, not from a render.
  const pageIndexRef = useRef(0);
  const pageBreaksRef = useRef<number[]>([]);
  const turnAnimationRef = useRef<Animation | null>(null);
  const ghostLayerElementRef = useRef<HTMLDivElement | null>(null);
  // The turn callbacks run from listeners, where render state would be stale.
  const pageHeightRef = useRef(0);
  // The doc position the shown page is tied to, or null once you have chosen a
  // page by hand — that choice outranks the cursor until you type again.
  const cursorPosRef = useRef<number | null>(null);

  const pageCount = bookPageCount(pageBreaks.length);

  /* ----- Page geometry ---------------------------------------------------- */

  // The flowing content box is measured, and the window is then sized to match
  // it exactly. Measuring the window itself would feed its own height back in.
  useEffect(() => {
    const element = bodyElementRef.current;
    if (!isBookMode || !element) {
      pageHeightRef.current = 0;
      setPageHeight(0);
      return;
    }
    const measure = () => {
      const height = Math.max(0, Math.floor(element.clientHeight));
      pageHeightRef.current = height;
      setPageHeight(height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isBookMode]);

  // Single owner of the page-view config: book mode wins, otherwise the
  // page-setup preference decides.
  useEffect(() => {
    if (!editor) return;
    if (isBookMode) {
      if (pageHeight > 0) setPageView(editor, { pageHeight, gapHeight: 0, topPadding: 0 });
      return;
    }
    setPageView(
      editor,
      pageLayout === "pages"
        ? { pageHeight: PAPER_CONTENT_HEIGHTS[paperSize], gapHeight: PAGE_GAP_HEIGHT }
        : null,
    );
  }, [editor, isBookMode, pageHeight, pageLayout, paperSize]);

  // Follow the plugin's measurements: they change as you type, resize or
  // change the font.
  useEffect(() => {
    if (!editor || !isBookMode) return;
    const read = () => {
      const positions = getPageBreakPositions(editor.state);
      if (isSameList(pageBreaksRef.current, positions)) return;
      pageBreaksRef.current = positions;
      setMeasuredBreaks(positions);
    };
    read();
    editor.on("transaction", read);
    return () => {
      editor.off("transaction", read);
      pageBreaksRef.current = NO_BREAKS;
    };
  }, [editor, isBookMode]);

  /* ----- Turning ---------------------------------------------------------- */

  const applyPage = useCallback((index: number) => {
    pageIndexRef.current = index;
    setPageIndex(index);
  }, []);

  /** Drops any page copy still turning, so a fast reader never stacks them. */
  const clearGhost = useCallback(() => {
    const layer = ghostLayerElementRef.current;
    if (!layer) return;
    layer.replaceChildren();
    delete layer.dataset.turn;
  }, []);

  const goToPageInternal = useCallback(
    (index: number, options?: { animate?: boolean }) => {
      const target = clampPageIndex(index, bookPageCount(pageBreaksRef.current.length));
      const from = pageIndexRef.current;
      if (target === from) return;

      const layer = ghostLayerElementRef.current;
      const viewport = viewportElementRef.current;
      const pages = viewport?.firstElementChild as HTMLElement | null;
      const card = viewport?.closest<HTMLElement>(".document-card") ?? null;
      const isForward = target > from;

      // The copy of the outgoing page has to be taken before the live editor
      // moves — after that, the page it showed is gone.
      const ghost =
        options?.animate && !prefersReducedMotion() && layer && card && pages
          ? buildPageGhost(card, pages, from, pageHeightRef.current)
          : null;

      // Whatever was still turning is abandoned mid-air; a fast reader gets
      // the page they asked for, not a queue of animations.
      turnAnimationRef.current?.cancel();
      clearGhost();
      applyPage(target);
      if (!ghost || !layer || !card) return;

      // Turning forward, the page you left lifts off the top of the stack.
      // Turning back, it stays where it is and the page you asked for comes
      // down over it — the same motion, run backwards.
      layer.dataset.turn = isForward ? "forward" : "back";
      layer.appendChild(ghost);
      const turning = isForward ? ghost : card;
      if (!isForward) prepareForTurn(card);
      const animation = turning.animate(TURN_FRAMES, {
        duration: TURN_MS,
        easing: TURN_EASING,
        direction: isForward ? "normal" : "reverse",
        // The live page holds its final frame until the hinge is taken off it,
        // so the two never swap over on different frames and flicker.
        fill: isForward ? "forwards" : "both",
      });
      turnAnimationRef.current = animation;

      let hasSettled = false;
      const settle = () => {
        if (hasSettled) return;
        hasSettled = true;
        if (!isForward) {
          restoreAfterTurn(card);
          animation.cancel();
        }
        // Only if this turn's copy is still the one on stage: a later turn has
        // already cleared it, and clearing again would take its copy away.
        if (ghost.parentElement === layer) clearGhost();
      };
      animation.addEventListener("finish", settle);
      animation.addEventListener("cancel", settle);
    },
    [applyPage, clearGhost],
  );

  // Asking for a page by hand means you want to be there, so the document
  // stops pulling you back to wherever the cursor is.
  const goToPage = useCallback(
    (index: number, options?: { animate?: boolean }) => {
      cursorPosRef.current = null;
      goToPageInternal(index, options);
    },
    [goToPageInternal],
  );

  const turnPage = useCallback(
    (direction: 1 | -1) => {
      goToPage(pageIndexRef.current + direction, { animate: true });
    },
    [goToPage],
  );

  useEffect(() => () => turnAnimationRef.current?.cancel(), []);

  /* ----- Staying on the right page ---------------------------------------- */

  // Repagination (typing, resizing) can drop the page you were on.
  useEffect(() => {
    if (!isBookMode) return;
    const clamped = clampPageIndex(pageIndexRef.current, pageCount);
    if (clamped !== pageIndexRef.current) goToPageInternal(clamped);
  }, [isBookMode, pageCount, goToPageInternal]);

  // Book mode opens on the page the cursor is already on.
  useEffect(() => {
    if (!isBookMode || !editor) return;
    cursorPosRef.current = editor.state.selection.from;
  }, [isBookMode, editor]);

  // …and keeps tracking it while it is being followed: the first measurement
  // only lands a beat after the config, and every later edit repaginates, so
  // the page the cursor sits on has to be recomputed each time rather than
  // resolved once on entry.
  useEffect(() => {
    if (!isBookMode || pageHeight === 0 || cursorPosRef.current === null) return;
    goToPageInternal(pageIndexForDocPos(pageBreaks, cursorPosRef.current));
  }, [isBookMode, pageHeight, pageBreaks, goToPageInternal]);

  // The cursor must never be off-screen: any selection change — typing, an AI
  // jump, "go to last highlight" — brings its page up and puts the document
  // back in charge of which page is shown.
  useEffect(() => {
    if (!editor || !isBookMode) return;
    let lastFrom = -1;
    const follow = () => {
      const { from } = editor.state.selection;
      if (from === lastFrom) return;
      lastFrom = from;
      cursorPosRef.current = from;
      goToPageInternal(pageIndexForDocPos(pageBreaksRef.current, from));
    };
    editor.on("selectionUpdate", follow);
    return () => {
      editor.off("selectionUpdate", follow);
    };
  }, [editor, isBookMode, goToPageInternal]);

  // ProseMirror scrolls the caret into view by scrolling any clipping ancestor
  // — which would slide the sheet out of alignment. The page is chosen above,
  // so pin the window and let it do nothing.
  useEffect(() => {
    const element = viewportElementRef.current;
    if (!isBookMode || !element) return;
    const pin = () => {
      if (element.scrollTop !== 0) element.scrollTop = 0;
      if (element.scrollLeft !== 0) element.scrollLeft = 0;
    };
    element.addEventListener("scroll", pin);
    return () => element.removeEventListener("scroll", pin);
  }, [isBookMode, pageHeight]);

  /* ----- Gestures --------------------------------------------------------- */

  useEffect(() => {
    if (!isBookMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "PageDown") return turn(event, 1);
      if (event.key === "PageUp") return turn(event, -1);
      // Arrows and space belong to whatever you are typing in; they only turn
      // pages when nothing editable has the keyboard.
      if (isEditingTarget(event.target)) return;
      if (event.key === "ArrowRight" || event.key === " ") return turn(event, 1);
      if (event.key === "ArrowLeft") return turn(event, -1);
    };
    const turn = (event: KeyboardEvent, direction: 1 | -1) => {
      event.preventDefault();
      turnPage(direction);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBookMode, turnPage]);

  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipedAtRef = useRef(Number.NEGATIVE_INFINITY);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // Touch only: a pen is markup, a mouse has the margins and the bar.
    if (event.pointerType !== "touch") return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start || event.pointerType !== "touch") return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (event.timeStamp - start.time > SWIPE_MAX_MS) return;
      if (Math.abs(deltaX) < SWIPE_MIN_PX) return;
      if (Math.abs(deltaY) > Math.abs(deltaX) * SWIPE_MAX_SLOPE) return;
      // A drag that selected text was a selection, not a page turn.
      if (!isSelectionCollapsed()) return;

      swipedAtRef.current = event.timeStamp;
      turnPage(deltaX < 0 ? 1 : -1);
    },
    [turnPage],
  );

  // A swipe that happens to end on a tap zone would otherwise turn twice: once
  // for the gesture, once for the click the browser sends afterwards.
  const handleClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.timeStamp - swipedAtRef.current > SWIPE_CLICK_GRACE_MS) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const attachBody = useCallback((element: HTMLDivElement | null) => {
    bodyElementRef.current = element;
  }, []);
  const attachViewport = useCallback((element: HTMLDivElement | null) => {
    viewportElementRef.current = element;
  }, []);
  const attachGhostLayer = useCallback((element: HTMLDivElement | null) => {
    ghostLayerElementRef.current = element;
  }, []);

  return {
    isBookMode,
    pageIndex,
    pageCount,
    attachBody,
    attachViewport,
    attachGhostLayer,
    viewportStyle: isBookMode && pageHeight > 0 ? { height: `${pageHeight}px` } : undefined,
    pagesStyle:
      isBookMode && pageHeight > 0
        ? { transform: `translateY(-${pageOffset(pageIndex, pageHeight)}px)` }
        : undefined,
    turnPage,
    goToPage,
    stageProps: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onClickCapture: handleClickCapture,
    },
  };
}

/**
 * The hinge, set only while the live page is turning: `backface-visibility`
 * promotes the element to its own layer, and a full screen of text should not
 * live there any longer than the turn lasts.
 */
function prepareForTurn(card: HTMLElement): void {
  card.style.transformOrigin = "left center";
  card.style.backfaceVisibility = "hidden";
}

function restoreAfterTurn(card: HTMLElement): void {
  card.style.transformOrigin = "";
  card.style.backfaceVisibility = "";
}

function isSameList(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function isSelectionCollapsed(): boolean {
  const selection = window.getSelection();
  return !selection || selection.isCollapsed;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
