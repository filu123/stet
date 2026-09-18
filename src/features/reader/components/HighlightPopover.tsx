"use client";

import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import type { Highlights } from "../hooks/useHighlights";
import { HIGHLIGHT_COLORS } from "../lib/highlight-runs";

/**
 * The colour picker for a selected passage, or for one already marked.
 *
 * Anchored to the bottom of the screen rather than floating beside the
 * selection: on a phone the selection handles and the magnifier are already
 * there, and a popover in that space is a popover under a thumb.
 */
export function HighlightPopover({ highlights }: { highlights: Highlights }) {
  const { target, apply, remove, dismiss } = highlights;
  if (!target) return null;

  return (
    <div role="dialog" aria-label="Highlight" className="reader-highlight-bar">
      <p className="reader-highlight-quote">
        “{target.kind === "selection" ? target.anchor.text : target.highlight.text}”
      </p>
      <div className="mt-2 flex items-center gap-2">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            aria-label={`Highlight ${color.name.toLowerCase()}`}
            // Keeps the selection on screen while the colour is tapped.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply(color.value)}
            className={cn(
              "size-8 shrink-0 rounded-full border transition-transform",
              target.kind === "existing" && target.highlight.color === color.value
                ? "scale-110 border-content-tertiary"
                : "border-border-subtle",
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}

        <span className="flex-1" />

        {target.kind === "existing" && (
          <button
            type="button"
            aria-label="Remove highlight"
            onClick={remove}
            className="inline-flex size-8 items-center justify-center rounded-full text-content-tertiary"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
        <button type="button" onClick={dismiss} className="text-sm text-content-secondary">
          Done
        </button>
      </div>
    </div>
  );
}
