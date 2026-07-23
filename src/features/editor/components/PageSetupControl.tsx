"use client";

import { useEffect, useState } from "react";

import { FileCog, Printer } from "lucide-react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import type { EditorFontSize, PageLayout, PaperSize } from "@/types/ui";

/** Toolbar popover: page layout, paper size, text size, print. */
export function PageSetupControl() {
  const [isOpen, setIsOpen] = useState(false);
  const { pageLayout, paperSize, fontSize, setPageLayout, setPaperSize, setFontSize } =
    useUiPreferencesStore();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      <ToolbarButton
        label="Page setup"
        isActive={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <FileCog className="size-3.5" aria-hidden />
      </ToolbarButton>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setIsOpen(false)} />
          <div className="dialog-pop absolute top-full right-0 z-40 mt-2 flex w-60 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-card p-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-content-secondary">Layout</span>
              <SegmentedControl<PageLayout>
                aria-label="Page layout"
                options={[
                  { value: "continuous", label: "Continuous" },
                  { value: "pages", label: "Pages" },
                ]}
                value={pageLayout}
                onChange={setPageLayout}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-content-secondary">Paper</span>
              <SegmentedControl<PaperSize>
                aria-label="Paper size"
                options={[
                  { value: "a4", label: "A4" },
                  { value: "letter", label: "Letter" },
                ]}
                value={paperSize}
                onChange={setPaperSize}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-content-secondary">Text size</span>
              <SegmentedControl<EditorFontSize>
                aria-label="Text size"
                options={[
                  { value: "small", label: "S" },
                  { value: "default", label: "M" },
                  { value: "large", label: "L" },
                ]}
                value={fontSize}
                onChange={setFontSize}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                window.print();
              }}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border-subtle text-sm font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
            >
              <Printer className="size-3.5" aria-hidden />
              Print / Save as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
