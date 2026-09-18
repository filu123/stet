"use client";

import { ChevronLeft, ChevronRight, Minimize2 } from "lucide-react";

import { leaveFocusMode } from "@/components/layout/FocusModeExit";
import { IconButton } from "@/components/ui/IconButton";

import { clampPageIndex } from "../lib/book-pagination";

interface BookModeBarProps {
  pageIndex: number;
  pageCount: number;
  onTurn: (direction: 1 | -1) => void;
  onGoToPage: (index: number) => void;
}

/**
 * Book mode's only permanent chrome: where you are, a scrubber, and a way out.
 *
 * Everything else you might do to the page — highlight, note, pen, AI — is
 * already reachable where it always was (selection bubble menu, floating
 * buttons), so the bar stays a reading control, not a second toolbar.
 */
export function BookModeBar({ pageIndex, pageCount, onTurn, onGoToPage }: BookModeBarProps) {
  // The field is remounted (`key`) whenever the page moves on its own —
  // turning, typing, repagination — so it never disagrees with the document.
  const commitGoToPage = (input: HTMLInputElement) => {
    const requested = Number.parseInt(input.value, 10);
    const target = Number.isNaN(requested) ? pageIndex : clampPageIndex(requested - 1, pageCount);
    input.value = String(target + 1);
    onGoToPage(target);
  };

  return (
    <div className="book-bar print-hidden flex shrink-0 items-center gap-2 border-t border-border-subtle px-3 py-2 sm:px-5">
      <IconButton
        aria-label="Exit book mode (Esc)"
        title="Exit book mode (Esc)"
        onClick={leaveFocusMode}
      >
        <Minimize2 className="size-4" aria-hidden />
      </IconButton>

      <IconButton
        aria-label="Previous page"
        title="Previous page"
        disabled={pageIndex <= 0}
        className="disabled:pointer-events-none disabled:opacity-35"
        onClick={() => onTurn(-1)}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </IconButton>

      <input
        type="range"
        aria-label="Page"
        min={1}
        max={pageCount}
        value={pageIndex + 1}
        // Scrubbing turns many pages at once — animating each would be a strobe.
        onChange={(event) => onGoToPage(Number(event.target.value) - 1)}
        className="book-scrubber min-w-0 flex-1"
      />

      <IconButton
        aria-label="Next page"
        title="Next page"
        disabled={pageIndex >= pageCount - 1}
        className="disabled:pointer-events-none disabled:opacity-35"
        onClick={() => onTurn(1)}
      >
        <ChevronRight className="size-4" aria-hidden />
      </IconButton>

      <div className="flex items-center gap-1.5 text-sm">
        <label className="sr-only" htmlFor="book-go-to-page">
          Go to page
        </label>
        <input
          key={pageIndex}
          id="book-go-to-page"
          type="text"
          inputMode="numeric"
          defaultValue={pageIndex + 1}
          title="Go to page"
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitGoToPage(event.currentTarget);
            event.currentTarget.blur();
          }}
          onBlur={(event) => commitGoToPage(event.currentTarget)}
          className="w-12 rounded-lg border border-border-subtle bg-surface-card px-1.5 py-1 text-center tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
        <span className="shrink-0 text-content-tertiary tabular-nums">of {pageCount}</span>
      </div>
    </div>
  );
}
