"use client";

import { cn } from "@/lib/utils/cn";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import type { PageWidth } from "@/types/ui";

/** Width options rendered as page-outline icons of increasing width. */
const WIDTH_OPTIONS: readonly { width: PageWidth; label: string; barClass: string }[] = [
  { width: "narrow", label: "Narrow page", barClass: "w-2" },
  { width: "default", label: "Default page", barClass: "w-3.5" },
  { width: "wide", label: "Wide page", barClass: "w-5" },
];

/** Toolbar control for resizing the document page. */
export function PageWidthControl() {
  const pageWidth = useUiPreferencesStore((state) => state.pageWidth);
  const setPageWidth = useUiPreferencesStore((state) => state.setPageWidth);

  return (
    <div role="radiogroup" aria-label="Page width" className="flex items-center gap-0.5">
      {WIDTH_OPTIONS.map((option) => {
        const isSelected = option.width === pageWidth;
        return (
          <button
            key={option.width}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setPageWidth(option.width)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-lg transition-colors",
              isSelected
                ? "bg-surface-hover text-accent"
                : "text-content-tertiary hover:bg-surface-hover hover:text-content-primary",
            )}
          >
            <span
              className={cn("h-3.5 rounded-[3px] border-[1.5px] border-current", option.barClass)}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
