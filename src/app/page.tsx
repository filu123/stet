"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DocumentCard } from "@/components/ui/DocumentCard";
import { useOpenMostRecentDocument } from "@/features/documents";

/** `/` opens the most recently edited document (creating one on first visit). */
export default function Home() {
  useOpenMostRecentDocument();

  return (
    <AppShell>
      <DocumentCard>
        <div className="min-h-64" aria-hidden />
      </DocumentCard>
    </AppShell>
  );
}
