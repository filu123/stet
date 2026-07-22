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
          {/* The squiggle — Stet's brand mark (an editor's wavy underline).
              Explicit width/height so it can never blow up before CSS loads. */}
          <svg
            viewBox="0 0 24 8"
            width="22"
            height="8"
            className="shrink-0 text-ai-grammar"
            aria-hidden
          >
            <path
              d="M1 5 Q 3.5 1, 6 5 T 11 5 T 16 5 T 21 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="truncate text-sm font-semibold">Stet</span>
        </header>

        <SidebarDocumentList />
      </div>
    </aside>
  );
}
