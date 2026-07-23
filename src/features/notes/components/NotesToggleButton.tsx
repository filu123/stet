"use client";

import { MessagesSquare } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface NotesToggleButtonProps {
  count: number;
  isOpen: boolean;
  onClick: () => void;
}

/** Toolbar button that opens the notes panel; shows a count badge. */
export function NotesToggleButton({ count, isOpen, onClick }: NotesToggleButtonProps) {
  return (
    <button
      type="button"
      aria-label="Notes"
      aria-pressed={isOpen}
      title="Notes"
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors",
        isOpen
          ? "border-accent bg-accent-soft text-accent"
          : "border-border-subtle bg-surface-card text-content-secondary hover:bg-surface-hover hover:text-content-primary",
      )}
    >
      <MessagesSquare className="size-4" aria-hidden />
      Notes
      {count > 0 && (
        <span
          className={cn(
            "inline-flex min-w-4 items-center justify-center rounded-full px-1 text-xs font-semibold",
            isOpen ? "bg-accent text-white" : "bg-surface-hover text-content-secondary",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
