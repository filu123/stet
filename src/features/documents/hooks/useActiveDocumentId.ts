"use client";

import { useParams } from "next/navigation";

/** The document id from the current `/document/[documentId]` route, or null. */
export function useActiveDocumentId(): string | null {
  const params = useParams<{ documentId?: string }>();
  return params.documentId ?? null;
}
