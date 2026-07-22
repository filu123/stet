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
        <header className="flex h-16 shrink-0 items-center gap-2.5 px-4">
          {/* Brand: the squiggle mark on an accent tile + wordmark */}
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
            <svg viewBox="0 0 20 8" width="18" height="8" aria-hidden>
              <path
                d="M1 4.5 Q 3 1.5, 5 4.5 T 9 4.5 T 13 4.5 T 17 4.5"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="flex-1 truncate text-base font-semibold">Stet</span>
          <IconButton aria-label="Collapse sidebar" onClick={onToggle}>
            <PanelLeftClose className="size-4" aria-hidden />
          </IconButton>
        </header>

        <SidebarDocumentList />
      </div>
    </aside>
  );
}
