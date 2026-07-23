import type { EditorDocument, TipTapJsonContent } from "@/types/document";

import * as browserRepository from "./browser-repository";
import * as fileRepository from "./file-repository";

/**
 * Storage backend selection + change notifications.
 *
 * Detection (once per session): if the local server's /api/storage route is
 * reachable, documents live as FILES on disk; otherwise (static hosting) the
 * app falls back to browser storage. On the first files-mode launch, any
 * existing browser documents are migrated into the folder.
 */

export interface DocumentBackend {
  createDocument(title?: string): Promise<EditorDocument>;
  getDocumentById(id: string): Promise<EditorDocument | undefined>;
  listDocumentsByRecency(): Promise<EditorDocument[]>;
  updateDocumentContent(id: string, content: TipTapJsonContent): Promise<void>;
  renameDocument(id: string, title: string): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}

export interface StorageInfo {
  mode: "files" | "browser";
  dataDir: string | null;
}

interface ResolvedStorage {
  backend: DocumentBackend;
  info: StorageInfo;
}

const MIGRATION_FLAG = "stet-migrated-to-files";

let storagePromise: Promise<ResolvedStorage> | null = null;

export function getStorage(): Promise<ResolvedStorage> {
  storagePromise ??= detectStorage();
  return storagePromise;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  return (await getStorage()).info;
}

async function detectStorage(): Promise<ResolvedStorage> {
  // SSR renders never touch storage for real — return the safe default.
  if (typeof window === "undefined") {
    return { backend: browserRepository, info: { mode: "browser", dataDir: null } };
  }
  try {
    const response = await fetch("/api/storage", { cache: "no-store" });
    if (response.ok) {
      const { dataDir } = (await response.json()) as { dataDir: string };
      await migrateBrowserDocumentsToFiles();
      return { backend: fileRepository, info: { mode: "files", dataDir } };
    }
  } catch {
    /* no server routes — static hosting */
  }
  return { backend: browserRepository, info: { mode: "browser", dataDir: null } };
}

/** Copies IndexedDB documents into the data folder, exactly once. */
async function migrateBrowserDocumentsToFiles(): Promise<void> {
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG)) return;
    const browserDocuments = await browserRepository.listDocumentsByRecency();
    for (const document of browserDocuments) {
      const alreadyOnDisk = await fileRepository.getDocumentById(document.id);
      if (!alreadyOnDisk) await fileRepository.putFullDocument(document);
    }
    window.localStorage.setItem(MIGRATION_FLAG, "done");
  } catch {
    // Leave the flag unset so the next launch retries.
  }
}

/* --- Change notifications (replaces Dexie liveQuery) ----------------------- */

const changeListeners = new Set<() => void>();

export function subscribeToDocumentChanges(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function notifyDocumentChanges(): void {
  changeListeners.forEach((listener) => listener());
}
