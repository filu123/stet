"use client";

import { useRouter } from "next/navigation";

import { createDocument, deleteDocument, listDocumentsByRecency } from "../lib/document-repository";

import { useActiveDocumentId } from "./useActiveDocumentId";

interface UseDocumentActionsResult {
  createAndOpenDocument: () => Promise<void>;
  /** Deletes immediately — confirmation UI is the caller's job (ConfirmDialog). */
  deleteDocumentAndNavigate: (documentId: string) => Promise<void>;
}

/** User-facing document actions that combine persistence with navigation. */
export function useDocumentActions(): UseDocumentActionsResult {
  const router = useRouter();
  const activeDocumentId = useActiveDocumentId();

  const createAndOpenDocument = async () => {
    const document = await createDocument();
    router.push(`/document/${document.id}`);
  };

  const deleteDocumentAndNavigate = async (documentId: string) => {
    await deleteDocument(documentId);

    // Deleting the open document must land the user somewhere sensible.
    if (documentId === activeDocumentId) {
      const remaining = await listDocumentsByRecency();
      router.replace(remaining[0] ? `/document/${remaining[0].id}` : "/");
    }
  };

  return { createAndOpenDocument, deleteDocumentAndNavigate };
}
