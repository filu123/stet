"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { DocumentCard } from "@/components/ui/DocumentCard";
import { useActiveDocumentId, useDocument } from "@/features/documents";
import { EditorScreen } from "@/features/editor";

export default function DocumentPage() {
  const documentId = useActiveDocumentId();
  const { document, isMissing } = useDocument(documentId);
  const router = useRouter();

  // Deep link to a deleted/unknown id → fall back to the most recent document.
  useEffect(() => {
    if (isMissing) router.replace("/");
  }, [isMissing, router]);

  return (
    <AppShell>
      {!document ? (
        <DocumentCard>
          <div className="min-h-64" aria-hidden />
        </DocumentCard>
      ) : (
        <EditorScreen key={document.id} document={document} />
      )}
    </AppShell>
  );
}
