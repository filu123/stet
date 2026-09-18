"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface BookPageTurnZonesProps {
  pageIndex: number;
  pageCount: number;
  onTurn: (direction: 1 | -1) => void;
}

/**
 * Kindle's tap zones: a strip down each side of the page itself, not the
 * gutter around it.
 *
 * They cover the sheet's own margin and the ragged end of each line, so they
 * only ever swallow a selection that *starts* in that strip — once a drag has
 * begun in the text, ProseMirror has the pointer and dragging across a zone
 * selects as usual. That is the trade that lets you both turn and mark up a
 * page you are reading full-screen.
 */
export function BookPageTurnZones({ pageIndex, pageCount, onTurn }: BookPageTurnZonesProps) {
  return (
    <>
      <TurnZone
        side="left"
        label="Previous page"
        isDisabled={pageIndex <= 0}
        onClick={() => onTurn(-1)}
      >
        <ChevronLeft className="size-6" aria-hidden />
      </TurnZone>
      <TurnZone
        side="right"
        label="Next page"
        isDisabled={pageIndex >= pageCount - 1}
        onClick={() => onTurn(1)}
      >
        <ChevronRight className="size-6" aria-hidden />
      </TurnZone>
    </>
  );
}

function TurnZone({
  side,
  label,
  isDisabled,
  onClick,
  children,
}: {
  side: "left" | "right";
  label: string;
  isDisabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={isDisabled}
      // Keeps the selection (and the bubble menu) alive across a page turn.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "book-turn-zone absolute inset-y-0 z-10 flex items-center text-content-tertiary",
        "opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
        side === "left" ? "left-0 justify-start pl-3" : "right-0 justify-end pr-3",
        isDisabled && "pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}
