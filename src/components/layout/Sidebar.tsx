"use client";

import { PanelLeftClose } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";
import { SidebarDocumentList } from "@/features/documents";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, isMobile, onToggle }: SidebarProps) {
  return (
    <>
      {/* Scrim behind the mobile drawer — tap to dismiss. */}
      {isMobile && isOpen && (
        <div
          className="overlay-fade fixed inset-0 z-40 bg-overlay md:hidden"
          aria-hidden
          onClick={onToggle}
        />
      )}

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "h-full shrink-0 overflow-hidden bg-surface-sidebar",
          // Mobile: fixed overlay drawer that slides in from the left.
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72",
          "max-md:transition-transform max-md:duration-300 max-md:ease-in-out",
          isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
          // Desktop: in-flow column that collapses its width.
          "md:transition-[width] md:duration-300 md:ease-in-out",
          isOpen ? "md:w-72" : "md:w-0",
        )}
      >
        {/* Fixed-width inner column so content doesn't squish during the collapse animation */}
        <div className="flex h-full w-72 flex-col border-r border-border-subtle">
          <header className="flex h-16 shrink-0 items-center px-4">
            {/* Stet wordmark: the colorful squiggle underlines the name —
                an editor's wavy line in the app's three AI markup colors.
                inline-flex shrinks the column to the word so the squiggle
                (width 100%) spans exactly the wordmark's width. */}
            <div className="flex flex-1 items-start">
              {/* The squiggle is absolutely positioned so only the word sets the
                  column width — the underline then spans exactly "Stet". */}
              <div className="relative inline-flex flex-col pb-2" aria-label="Stet">
                <span className="text-2xl leading-none font-bold tracking-tight">Stet</span>
                <svg
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                  className="absolute inset-x-0 bottom-0 h-1.5 w-full"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="stet-squiggle" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" style={{ stopColor: "var(--ai-grammar)" }} />
                      <stop offset="50%" style={{ stopColor: "var(--ai-style)" }} />
                      <stop offset="100%" style={{ stopColor: "var(--ai-circle)" }} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M1 3.5 Q 7 1, 13 3.5 T 25 3.5 T 37 3.5 T 49 3.5 T 61 3.5 T 73 3.5 T 85 3.5 T 99 3.5"
                    fill="none"
                    stroke="url(#stet-squiggle)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
            <IconButton aria-label="Collapse sidebar" onClick={onToggle}>
              <PanelLeftClose className="size-4" aria-hidden />
            </IconButton>
          </header>

          <SidebarDocumentList />
        </div>
      </aside>
    </>
  );
}
