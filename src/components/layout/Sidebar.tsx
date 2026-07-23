"use client";

import { PanelLeftClose } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";
import { SidebarDocumentList } from "@/features/documents";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "h-full shrink-0 overflow-hidden bg-surface-sidebar",
        "transition-[width] duration-300 ease-in-out",
        isOpen ? "w-72" : "w-0",
      )}
    >
      {/* Fixed-width inner column so content doesn't squish during the collapse animation */}
      <div className="flex h-full w-72 flex-col border-r border-border-subtle">
        <header className="flex h-16 shrink-0 items-center px-4">
          {/* Stet wordmark: the colorful squiggle underlines the name —
              an editor's wavy line in the app's three AI markup colors. */}
          <div className="flex flex-1 flex-col items-start" aria-label="Stet">
            <span className="text-base leading-tight font-semibold">Stet</span>
            <svg viewBox="0 0 30 6" width="30" height="6" className="shrink-0" aria-hidden>
              <defs>
                <linearGradient id="stet-squiggle" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" style={{ stopColor: "var(--ai-grammar)" }} />
                  <stop offset="50%" style={{ stopColor: "var(--ai-style)" }} />
                  <stop offset="100%" style={{ stopColor: "var(--ai-circle)" }} />
                </linearGradient>
              </defs>
              <path
                d="M1 3.5 Q 3.5 1, 6 3.5 T 11 3.5 T 16 3.5 T 21 3.5 T 26 3.5"
                fill="none"
                stroke="url(#stet-squiggle)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <IconButton aria-label="Collapse sidebar" onClick={onToggle}>
            <PanelLeftClose className="size-4" aria-hidden />
          </IconButton>
        </header>

        <SidebarDocumentList />
      </div>
    </aside>
  );
}
