import { FileText } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { SidebarDocumentList } from "@/features/documents";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "h-full shrink-0 overflow-hidden bg-surface-sidebar",
        "transition-[width] duration-300 ease-in-out",
        isOpen ? "w-64" : "w-0",
      )}
    >
      {/* Fixed-width inner column so content doesn't squish during the collapse animation */}
      <div className="flex h-full w-64 flex-col border-r border-border-subtle">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4">
          <FileText className="size-4 text-content-secondary" aria-hidden />
          <span className="truncate text-sm font-semibold">Open Source AI Editor</span>
        </header>

        <SidebarDocumentList />
      </div>
    </aside>
  );
}
