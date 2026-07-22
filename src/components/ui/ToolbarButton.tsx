"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  children: ReactNode;
}

/** Small flat button for editor toolbars and bubble menus. */
export function ToolbarButton({
  label,
  onClick,
  isActive = false,
  isDisabled = false,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      title={label}
      disabled={isDisabled}
      // preventDefault keeps the editor's text selection while clicking
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg transition-colors",
        isActive
          ? "bg-surface-hover text-accent"
          : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
        isDisabled && "pointer-events-none opacity-35",
      )}
    >
      {children}
    </button>
  );
}
