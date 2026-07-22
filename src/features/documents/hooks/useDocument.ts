"use client";

import { useLiveQuery } from "dexie-react-hooks";

import type { EditorDocument } from "@/types/document";

import { getDocumentById } from "../lib/document-repository";

interface UseDocumentResult {
  /** `undefined` while loading, `null` when the id doesn't exist. */
  document: EditorDocument | null | undefined;
  /** True once loading finished and the document genuinely doesn't exist. */
  isMissing: boolean;
}

/** Live-loads one document by id — re-renders on every change to it. */
export function useDocument(documentId: string | null): UseDocumentResult {
  const document = useLiveQuery(
    async () => (documentId ? ((await getDocumentById(documentId)) ?? null) : null),
    [documentId],
  );

  return { document, isMissing: document === null && documentId !== null };
}
