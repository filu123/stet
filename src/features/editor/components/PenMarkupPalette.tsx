"use client";

import { useEffect } from "react";

import { Eraser } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { usePenMarkupStore } from "@/stores/pen-markup-store";

import { setPenDetectedHandler, setPenTool } from "../extensions/pen-markup";
import { HIGHLIGHT_COLORS } from "../lib/highlight-colors";

/**
 * The stylus color picker. Hidden until a pen is actually seen in this
 * session, so nothing changes on a laptop — pick up the S Pen and it appears.
 *
 * Strokes are handled entirely by the PenMarkup extension; this only chooses
 * what the next stroke does.
 */
export function PenMarkupPalette() {
  const { color, isEraser, isPenDetected, setColor, setEraser, markPenDetected } =
    usePenMarkupStore();

  // Push the tool choice down to the ProseMirror plugin, which reads it
  // imperatively when a stroke starts.
  useEffect(() => {
    setPenTool({ color, isEraser });
  }, [color, isEraser]);

  useEffect(() => {
    setPenDetectedHandler(markPenDetected);
    return () => setPenDetectedHandler(null);
  }, [markPenDetected]);

  if (!isPenDetected) return null;

  return (
    <div
      role="toolbar"
      aria-label="Pen markup"
      className="pen-markup-palette print-hidden fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border-subtle bg-surface-card px-2 py-1.5"
    >
      {HIGHLIGHT_COLORS.map((highlightColor) => {
        const isActive = !isEraser && color === highlightColor.cssValue;
        return (
          <button
            key={highlightColor.name}
            type="button"
            aria-label={`Highlight ${highlightColor.name}`}
            aria-pressed={isActive}
            title={`Highlight ${highlightColor.name}`}
            onClick={() => setColor(highlightColor.cssValue)}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
              isActive ? "bg-surface-hover" : "hover:bg-surface-hover",
            )}
          >
            <span
              className={cn(
                "size-5 rounded-full border transition-transform",
                isActive ? "scale-110 border-content-tertiary" : "border-border-subtle",
              )}
              style={{ backgroundColor: highlightColor.cssValue }}
              aria-hidden
            />
          </button>
        );
      })}

      <span className="mx-0.5 h-5 w-px bg-border-subtle" aria-hidden />

      <button
        type="button"
        aria-label="Eraser"
        aria-pressed={isEraser}
        title="Erase highlights"
        onClick={() => setEraser(!isEraser)}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
          isEraser
            ? "bg-surface-hover text-content-primary"
            : "text-content-tertiary hover:bg-surface-hover hover:text-content-primary",
        )}
      >
        <Eraser className="size-4" aria-hidden />
      </button>
    </div>
  );
}
