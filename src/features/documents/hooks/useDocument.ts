"use client";

import { useEffect, useState } from "react";

import type { EditorDocument } from "@/types/document";

import { getDocumentById } from "../lib/document-repository";
import { subscribeToDocumentChanges } from "../lib/storage-backend";

interface UseDocumentResult {
  /** `undefined` while loading, `null` when the id doesn't exist. */
  document: EditorDocument | null | undefined;
  /** True once loading finished and the document genuinely doesn't exist. */
  isMissing: boolean;
}

interface LoadedDocument {
  id: string;
  document: EditorDocument | null;
}

/** Loads one document by id and refetches whenever any document changes. */
export function useDocument(documentId: string | null): UseDocumentResult {
  // Tagged with the id it was loaded for, so switching documents can never
  // show a stale result from the previous id.
  const [loaded, setLoaded] = useState<LoadedDocument | undefined>(undefined);

  useEffect(() => {
    if (!documentId) return;
    let isCancelled = false;
    const load = async () => {
      const document = await getDocumentById(documentId);
      if (!isCancelled) setLoaded({ id: documentId, document: document ?? null });
    };
    void load();
    const unsubscribe = subscribeToDocumentChanges(() => void load());
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [documentId]);

  if (!documentId) return { document: null, isMissing: false };
  const document = loaded?.id === documentId ? loaded.document : undefined;
  return { document, isMissing: document === null };
}
