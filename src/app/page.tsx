"use client";

import { AppShell } from "@/components/layout/AppShell";
import { HomeScreen } from "@/features/documents";

/** `/` — the home dashboard: greeting, quick actions, and recent documents. */
export default function Home() {
  return (
    <AppShell>
      <HomeScreen />
    </AppShell>
  );
}
