"use client";

import { useEffect, useState } from "react";

import { Check, ChevronDown, Type } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import type { DocumentFont } from "@/types/ui";

const FONT_OPTIONS: { value: DocumentFont; label: string; className: string }[] = [
  { value: "sans", label: "Sans", className: "font-sans" },
  { value: "serif", label: "Serif", className: "font-doc-serif" },
  { value: "rounded", label: "Rounded", className: "font-doc-rounded" },
  { value: "mono", label: "Mono", className: "font-mono" },
];

/** Toolbar dropdown to choose the document's typeface. */
export function FontControl() {
  const [isOpen, setIsOpen] = useState(false);
  const { fontFamily, setFontFamily } = useUiPreferencesStore();
  const active = FONT_OPTIONS.find((option) => option.value === fontFamily) ?? FONT_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Document font"
        title="Document font"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex h-7 items-center gap-1 rounded-lg px-1.5 transition-colors",
          isOpen
            ? "bg-surface-hover text-content-primary"
            : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
        )}
      >
        <Type className="size-3.5" aria-hidden />
        <span className="text-xs font-medium">{active.label}</span>
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setIsOpen(false)} />
          <div className="dialog-pop absolute top-full left-0 z-40 mt-2 flex w-40 flex-col gap-0.5 rounded-xl border border-border-subtle bg-surface-card p-1.5">
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFontFamily(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover",
                  option.className,
                  fontFamily === option.value ? "text-content-primary" : "text-content-secondary",
                )}
              >
                {option.label}
                {fontFamily === option.value && (
                  <Check className="size-3.5 shrink-0 text-accent" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
