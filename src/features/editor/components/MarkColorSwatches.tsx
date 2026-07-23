"use client";

import { Ban } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { HIGHLIGHT_COLORS } from "../lib/highlight-colors";
import { MARK_COLORS } from "../lib/mark-colors";

type MarkColorVariant = "underline" | "circle" | "highlight";

interface MarkColorSwatchesProps {
  variant: MarkColorVariant;
  isColorActive: (cssValue: string) => boolean;
  onPick: (cssValue: string) => void;
  /** When set, a trailing "clear" swatch removes the mark entirely. */
  onRemove?: () => void;
}

const ACTION_LABELS: Record<MarkColorVariant, string> = {
  underline: "Underline",
  circle: "Circle",
  highlight: "Highlight",
};

/**
 * Color choices for underline (bars), circle (rings), and highlight (fills).
 * Rendered inline when the corresponding menu button expands its picker.
 */
export function MarkColorSwatches({
  variant,
  isColorActive,
  onPick,
  onRemove,
}: MarkColorSwatchesProps) {
  const actionLabel = ACTION_LABELS[variant];
  const colors = variant === "highlight" ? HIGHLIGHT_COLORS : MARK_COLORS;

  return (
    <>
      {colors.map((color) => (
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
          ) : variant === "circle" ? (
            <span
              className="size-3.5 rounded-full border-[1.5px]"
              style={{ borderColor: color.cssValue }}
              aria-hidden
            />
          ) : (
            <span
              className="size-3.5 rounded-full border border-border-subtle"
              style={{ backgroundColor: color.cssValue }}
              aria-hidden
            />
          )}
        </button>
      ))}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${actionLabel.toLowerCase()}`}
          title={`Remove ${actionLabel.toLowerCase()}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
        >
          <Ban className="size-3.5" aria-hidden />
        </button>
      )}
    </>
  );
}
