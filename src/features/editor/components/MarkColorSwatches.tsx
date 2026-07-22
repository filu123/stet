"use client";

import { cn } from "@/lib/utils/cn";

import { MARK_COLORS } from "../lib/mark-colors";

interface MarkColorSwatchesProps {
  variant: "underline" | "circle";
  isColorActive: (cssValue: string) => boolean;
  onPick: (cssValue: string) => void;
}

/**
 * Color choices for underline (bars) and circle (rings) marks.
 * Rendered inline when the corresponding menu button expands its picker.
 */
export function MarkColorSwatches({ variant, isColorActive, onPick }: MarkColorSwatchesProps) {
  const actionLabel = variant === "underline" ? "Underline" : "Circle";

  return (
    <>
      {MARK_COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          aria-label={`${actionLabel} ${color.name}`}
          title={`${actionLabel} ${color.name}`}
          // preventDefault keeps the editor's text selection while clicking
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(color.cssValue)}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover",
            isColorActive(color.cssValue) && "bg-surface-hover",
          )}
        >
          {variant === "underline" ? (
            <span
              className="h-1 w-3.5 rounded-full"
              style={{ backgroundColor: color.cssValue }}
              aria-hidden
            />
          ) : (
            <span
              className="size-3.5 rounded-full border-[1.5px]"
              style={{ borderColor: color.cssValue }}
              aria-hidden
            />
          )}
        </button>
      ))}
    </>
  );
}
