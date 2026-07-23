import type { EditorDocument, TipTapJsonContent } from "@/types/document";

import {
  getStorage,
  notifyDocumentChanges,
} from "./storage-backend";

/**
 * The ONLY module the rest of the app talks to for document persistence.
 * Delegates to the detected backend (files on disk, or browser storage) and
 * emits change notifications after every mutation so hooks can refetch.
 */

export async function createDocument(title = "Untitled"): Promise<EditorDocument> {
  const { backend } = await getStorage();
  const document = await backend.createDocument(title);
  notifyDocumentChanges();
  return document;
}

/**
 * Creates a first document if storage is empty. In-flight calls are shared so
 * React Strict Mode's doubled effects can't create duplicates.
 */
let ensureInFlight: Promise<void> | null = null;

export function ensureDocumentExists(): Promise<void> {
  ensureInFlight ??= (async () => {
    const { backend } = await getStorage();
    const documents = await backend.listDocumentsByRecency();
    if (documents.length === 0) {
      await backend.createDocument();
      notifyDocumentChanges();
    }
  })().finally(() => {
    ensureInFlight = null;
  });
  return ensureInFlight;
}

export async function getDocumentById(id: string): Promise<EditorDocument | undefined> {
  const { backend } = await getStorage();
  return backend.getDocumentById(id);
}

export async function listDocumentsByRecency(): Promise<EditorDocument[]> {
  const { backend } = await getStorage();
  return backend.listDocumentsByRecency();
}

export async function updateDocumentContent(
  id: string,
  content: TipTapJsonContent,
): Promise<void> {
  const { backend } = await getStorage();
  await backend.updateDocumentContent(id, content);
  notifyDocumentChanges();
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const { backend } = await getStorage();
  await backend.renameDocument(id, title);
  notifyDocumentChanges();
}

export async function deleteDocument(id: string): Promise<void> {
  const { backend } = await getStorage();
  await backend.deleteDocument(id);
  notifyDocumentChanges();
}

/* --- Folders ---------------------------------------------------------------- */

export async function listFolders() {
  const { backend } = await getStorage();
  return backend.listFolders();
}

export async function createFolder(name: string): Promise<void> {
  const { backend } = await getStorage();
  await backend.createFolder(name);
  notifyDocumentChanges();
}

/** Deleting a folder moves its documents back to unfiled — never deletes them. */
export async function deleteFolder(name: string): Promise<void> {
  const { backend } = await getStorage();
  await backend.deleteFolder(name);
  notifyDocumentChanges();
}

export async function moveDocumentToFolder(
  id: string,
  folderName: string | null,
): Promise<void> {
  const { backend } = await getStorage();
  await backend.moveDocumentToFolder(id, folderName);
  notifyDocumentChanges();
}
