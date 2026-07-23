"use client";

import { MoveHorizontal } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import type { PageWidth } from "@/types/ui";

/** Toolbar control for the document page width. */
export function PageWidthControl() {
  const pageWidth = useUiPreferencesStore((state) => state.pageWidth);
  const setPageWidth = useUiPreferencesStore((state) => state.setPageWidth);

  const buttonClass = (isSelected: boolean) =>
    cn(
      "inline-flex size-7 items-center justify-center rounded-lg transition-colors",
      isSelected
        ? "bg-surface-hover text-accent"
        : "text-content-tertiary hover:bg-surface-hover hover:text-content-primary",
    );

  const select = (width: PageWidth, isSelected: boolean) => ({
    role: "radio" as const,
    "aria-checked": isSelected,
    onClick: () => setPageWidth(width),
    className: buttonClass(isSelected),
  });

  return (
    <div role="radiogroup" aria-label="Page width" className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Default page"
        title="Default page"
        {...select("default", pageWidth === "default")}
      >
        <span className="h-3.5 w-3.5 rounded-[3px] border-[1.5px] border-current" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Wide page"
        title="Wide page"
        {...select("wide", pageWidth === "wide")}
      >
        <span className="h-3.5 w-5 rounded-[3px] border-[1.5px] border-current" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Free width"
        title="Free width — drag the page edges"
        {...select("free", pageWidth === "free")}
      >
        <MoveHorizontal className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
