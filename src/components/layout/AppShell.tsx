"use client";

import { useState, type ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();
  // `null` = follow the breakpoint default (open on desktop, closed on mobile).
  // Once the user toggles, their choice sticks for the session.
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const isSidebarOpen = openOverride ?? !isMobile;

  const handleToggleSidebar = () => setOpenOverride(!isSidebarOpen);

  return (
    <div className="app-shell flex h-dvh bg-surface-app">
      <Sidebar isOpen={isSidebarOpen} isMobile={isMobile} onToggle={handleToggleSidebar} />

      <div className="app-shell flex min-w-0 flex-1 flex-col">
        <TopBar isSidebarOpen={isSidebarOpen && !isMobile} onToggleSidebar={handleToggleSidebar} />
        <main className="app-main flex-1 overflow-y-auto px-4 pt-4 pb-12 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
