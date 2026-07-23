"use client";

import { useEffect, useState } from "react";

import type { EditorDocument, FolderSummary } from "@/types/document";

import { listDocumentsByRecency, listFolders } from "../lib/document-repository";
import { subscribeToDocumentChanges } from "../lib/storage-backend";

interface DocumentLibrary {
  /** `undefined` while the first load is in flight. */
  documents: EditorDocument[] | undefined;
  folders: FolderSummary[];
}

/** Reactive view of every document + folder, kept in sync with storage. */
export function useDocumentLibrary(): DocumentLibrary {
  const [documents, setDocuments] = useState<EditorDocument[] | undefined>(undefined);
  const [folders, setFolders] = useState<FolderSummary[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      const [loadedDocuments, loadedFolders] = await Promise.all([
        listDocumentsByRecency(),
        listFolders(),
      ]);
      if (isCancelled) return;
      setDocuments(loadedDocuments);
      setFolders(loadedFolders);
    };
    void load();
    const unsubscribe = subscribeToDocumentChanges(() => void load());
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  return { documents, folders };
}
