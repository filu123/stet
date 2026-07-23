"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DocumentsLibrary } from "@/features/documents";

/** `/documents` — the full library: every document as a card grid. */
export default function DocumentsPage() {
  return (
    <AppShell>
      <DocumentsLibrary />
    </AppShell>
  );
}
