"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

import {
  beginPenSweep,
  caretFromPoint,
  endPenSweep,
  selectStroke,
} from "../lib/pen-selection";
import { readSelectionAnchor, type SelectionAnchor } from "../lib/selection-anchor";

/**
 * One thumb, three outcomes — and a stylus that does something else entirely.
 *
 * Tap low on the page to turn: left quarter back, the rest forward, because
 * forward is what you do a thousand times and it should be the whole thumb's
 * reach. Tap the top edge for the chrome. Swipe in any direction to turn.
 *
 * A pen never turns pages. Sweeping it across a line highlights, the way a
 * marker would, which is the only thing anybody picks up a stylus over a book
 * to do.
 */

/** Movement under this is a tap, not a drag. */
const TAP_SLOP_PX = 10;
/**
 * A press held longer than this was going for the text, not the page. On touch
 * a long-press starts a selection without moving at all, so duration is the
 * only thing that tells the two apart.
 */
const TAP_MAX_MS = 450;
/** Distance a swipe has to cover to count. */
const SWIPE_PX = 55;
/** Taps above this fraction of the height reveal the chrome instead of turning. */
const CHROME_BAND = 0.18;
/** Taps left of this fraction go back. */
const BACK_BAND = 0.25;
/** How long stylus mode outlives the pen leaving hover range. */
const PEN_HOVER_GRACE_MS = 1200;

export interface ReaderGestureHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerOver: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerOut: (event: ReactPointerEvent<HTMLElement>) => void;
}

export function useReaderGestures(actions: {
  onNext: () => void;
  onPrevious: () => void;
  onToggleChrome: () => void;
  /** A finished pen stroke, ready to be marked. */
  onPenSweep: (anchor: SelectionAnchor) => void;
}): ReaderGestureHandlers {
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const penAnchorRef = useRef<{ node: Node; offset: number } | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  // Actions change identity every render; a ref keeps the handlers stable so
  // the gesture surface is not rebound on every page turn.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(
    () => () => {
      if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
      endPenSweep();
    },
    [],
  );

  /**
   * Chrome pans the page for stylus drags unless `touch-action` was already
   * `none` when the gesture began — too late to set it on pointerdown. A pen
   * announces itself by hovering, so stylus mode goes on as it approaches and
   * comes off shortly after it leaves, and a finger keeps scrolling as usual.
   */
  const onPointerOver = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "pen") return;
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    event.currentTarget.classList.add("pen-hovering");
  }, []);

  const onPointerOut = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "pen") return;
    const surface = event.currentTarget;
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(
      () => surface.classList.remove("pen-hovering"),
      PEN_HOVER_GRACE_MS,
    );
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "pen") {
      const anchor = caretFromPoint(event.clientX, event.clientY);
      if (!anchor) return;
      event.currentTarget.classList.add("pen-hovering");
      penAnchorRef.current = anchor;
      beginPenSweep();
      // Capture on the surface so a stroke that wanders off it still delivers
      // its moves — and its own pointerup — here.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* best effort; the stroke still works without it */
      }
      event.preventDefault();
      return;
    }
    startRef.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const anchor = penAnchorRef.current;
    if (!anchor || event.pointerType !== "pen") return;
    event.preventDefault();
    const head = caretFromPoint(event.clientX, event.clientY);
    // Off the text (a margin, past the last line) — keep the sweep as it was.
    if (head) selectStroke(anchor, head);
  }, []);

  const endPenStroke = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    penAnchorRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    const anchor = readSelectionAnchor();
    endPenSweep();
    if (anchor) actionsRef.current.onPenSweep(anchor);
    else window.getSelection()?.removeAllRanges();
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (penAnchorRef.current) {
        event.preventDefault();
        endPenStroke(event);
        return;
      }

      const start = startRef.current;
      startRef.current = null;
      if (!start || event.pointerType === "pen") return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const held = event.timeStamp - start.time;
      const { onNext, onPrevious, onToggleChrome } = actionsRef.current;

      // A selection is live: the reader is reaching for the highlighter, and
      // the page must not move out from under it. The highlight bar opens off
      // `selectionchange`, not from here.
      if (!isSelectionCollapsed()) return;

      // A tap that lands on an existing highlight belongs to that highlight —
      // the screen would otherwise turn the page out from under the tap.
      const target = event.target;
      if (target instanceof Element && target.closest("[data-highlight-id]")) return;

      if (Math.abs(deltaX) < TAP_SLOP_PX && Math.abs(deltaY) < TAP_SLOP_PX) {
        // A long press was an attempt at the text, even if it caught nothing.
        if (held > TAP_MAX_MS) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        if (y < CHROME_BAND) onToggleChrome();
        else if (x < BACK_BAND) onPrevious();
        else onNext();
        return;
      }

      // Swipe left or up to go on — both mean "next" in the two interfaces
      // people use most, a book and a feed.
      if (Math.abs(deltaX) >= SWIPE_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) onNext();
        else onPrevious();
        return;
      }
      if (Math.abs(deltaY) >= SWIPE_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY < 0) onNext();
        else onPrevious();
      }
    },
    [endPenStroke],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      startRef.current = null;
      if (penAnchorRef.current) endPenStroke(event);
    },
    [endPenStroke],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerOver,
    onPointerOut,
  };
}

function isSelectionCollapsed(): boolean {
  const selection = window.getSelection();
  return !selection || selection.isCollapsed || !selection.toString().trim();
}
