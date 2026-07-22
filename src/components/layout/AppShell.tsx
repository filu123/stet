"use client";

import { useState, type ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggleSidebar = () => setIsSidebarOpen((isOpen) => !isOpen);

  return (
    <div className="flex h-dvh bg-surface-app">
      <Sidebar isOpen={isSidebarOpen} onToggle={handleToggleSidebar} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar isSidebarOpen={isSidebarOpen} onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-12 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
