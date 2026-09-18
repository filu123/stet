"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useReaderStore } from "@/stores/reader-store";

import { isWorthHighlighting } from "../lib/highlight-runs";
import { isPenSweeping } from "../lib/pen-selection";
import {
  addHighlight,
  deleteHighlight,
  listHighlights,
  updateHighlightColor,
} from "../lib/reader-repository";
import { readSelectionAnchor, type SelectionAnchor } from "../lib/selection-anchor";
import type { BookHighlight } from "../types";

/** Long enough for selection handles to settle before the bar appears. */
const SELECTION_SETTLE_MS = 220;

/** What the colour picker is currently pointed at. */
export type HighlightTarget =
  | { kind: "selection"; anchor: SelectionAnchor }
  | { kind: "existing"; highlight: BookHighlight };

export interface Highlights {
  /** Only the ones on the chapter being read — the render path stays small. */
  forChapter: BookHighlight[];
  all: BookHighlight[];
  target: HighlightTarget | null;
  openExisting: (highlightId: string) => void;
  dismiss: () => void;
  apply: (color: string) => void;
  remove: () => void;
  /** A finished pen stroke: marks straight away, like a real marker. */
  sweep: (anchor: SelectionAnchor) => void;
}

/**
 * The reader's marks on a book.
 *
 * The selection is watched through `selectionchange` rather than through
 * pointer events, which is the whole reason the first attempt did not work on
 * a phone: when a long press turns into a text selection the browser takes
 * the gesture over and delivers `pointercancel`, so the `pointerup` this used
 * to wait for never arrived. `selectionchange` fires however the selection was
 * made — long press, mouse drag, keyboard, or a pen sweep.
 *
 * The anchor is also resolved the moment the selection exists and kept, rather
 * than re-read when a colour is tapped. Tapping anything can collapse a
 * selection on touch, and re-reading it there found nothing to highlight.
 */
export function useHighlights(bookId: string | null, chapterIndex: number): Highlights {
  const lastColor = useReaderStore((state) => state.highlightColor);
  const setLastColor = useReaderStore((state) => state.setHighlightColor);

  const [all, setAll] = useState<BookHighlight[]>([]);
  const [target, setTarget] = useState<HighlightTarget | null>(null);
  // Read by the pen and by taps, which fire from listeners rather than renders.
  const allRef = useRef<BookHighlight[]>([]);
  useEffect(() => {
    allRef.current = all;
  }, [all]);

  useEffect(() => {
    if (!bookId) return;
    let isStale = false;
    void listHighlights(bookId).then((stored) => {
      if (!isStale) setAll(stored);
    });
    return () => {
      isStale = true;
    };
  }, [bookId]);

  // Watch the selection itself.
  useEffect(() => {
    let timer: number | null = null;

    const handleSelectionChange = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (isPenSweeping()) return;
        const anchor = readSelectionAnchor();
        if (anchor && isWorthHighlighting(anchor.text)) {
          setTarget({ kind: "selection", anchor });
          return;
        }
        // The selection went away: close the bar, unless it is showing an
        // existing highlight the reader tapped rather than a fresh selection.
        setTarget((current) => (current?.kind === "selection" ? null : current));
      }, SELECTION_SETTLE_MS);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const forChapter = useMemo(
    () => all.filter((highlight) => highlight.chapterIndex === chapterIndex),
    [all, chapterIndex],
  );

  const save = useCallback((highlight: Omit<BookHighlight, "id" | "createdAt">) => {
    void addHighlight(highlight).then((saved) => setAll((current) => [...current, saved]));
  }, []);

  const openExisting = useCallback((highlightId: string) => {
    const highlight = allRef.current.find((entry) => entry.id === highlightId);
    if (highlight) setTarget({ kind: "existing", highlight });
  }, []);

  const dismiss = useCallback(() => {
    setTarget(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const apply = useCallback(
    (color: string) => {
      if (!bookId || !target) return;
      setLastColor(color);

      if (target.kind === "existing") {
        const { id } = target.highlight;
        setAll((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, color } : entry)),
        );
        void updateHighlightColor(id, color);
      } else {
        save({ bookId, color, ...target.anchor });
      }
      dismiss();
    },
    [bookId, target, save, setLastColor, dismiss],
  );

  const remove = useCallback(() => {
    if (target?.kind !== "existing") return;
    const { id } = target.highlight;
    setAll((current) => current.filter((entry) => entry.id !== id));
    void deleteHighlight(id);
    dismiss();
  }, [target, dismiss]);

  /**
   * A pen sweep marks immediately — a highlighter that asked which colour
   * every time you drew with it would be a strange highlighter. Sweeping back
   * over a passage already marked erases it, the way a real marker cannot but
   * every reader wishes it could.
   */
  const sweep = useCallback(
    (anchor: SelectionAnchor) => {
      if (!bookId) return;
      window.getSelection()?.removeAllRanges();
      setTarget(null);

      const overlapping = allRef.current.filter(
        (highlight) =>
          highlight.chapterIndex === anchor.chapterIndex &&
          highlight.blockIndex === anchor.blockIndex &&
          highlight.start < anchor.end &&
          highlight.end > anchor.start,
      );
      const startedOnAMark = overlapping.some(
        (highlight) => highlight.start <= anchor.start && highlight.end > anchor.start,
      );

      if (startedOnAMark) {
        const doomed = new Set(overlapping.map((highlight) => highlight.id));
        setAll((current) => current.filter((entry) => !doomed.has(entry.id)));
        doomed.forEach((id) => void deleteHighlight(id));
        return;
      }
      save({ bookId, color: lastColor, ...anchor });
    },
    [bookId, lastColor, save],
  );

  return { forChapter, all, target, openExisting, dismiss, apply, remove, sweep };
}
