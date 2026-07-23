import { database } from "@/lib/db/database";
import type { EditorDocument, FolderSummary, TipTapJsonContent } from "@/types/document";

/**
 * Browser (IndexedDB/Dexie) storage backend — the fallback used when the app
 * is statically hosted and the file-storage API routes don't exist.
 */

/** Pre-v2 records lack folderName — normalize to null. */
function normalizeDocument(document: EditorDocument): EditorDocument {
  return { ...document, folderName: document.folderName ?? null };
}

export async function createDocument(title = "Untitled"): Promise<EditorDocument> {
  const now = new Date();
  const document: EditorDocument = {
    id: crypto.randomUUID(),
    title,
    content: null,
    folderName: null,
    createdAt: now,
    updatedAt: now,
  };
  await database.documents.add(document);
  return document;
}

export async function getDocumentById(id: string): Promise<EditorDocument | undefined> {
  const document = await database.documents.get(id);
  return document ? normalizeDocument(document) : undefined;
}

export async function listDocumentsByRecency(): Promise<EditorDocument[]> {
  // In-memory sort rather than `orderBy("updatedAt")`: autosave rewrites that
  // index constantly, and a primary-key scan is immune to index-mutation edge
  // cases. Document counts are small — sorting in memory is free.
  const documents = await database.documents.toArray();
  return documents
    .map(normalizeDocument)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function updateDocumentContent(
  id: string,
  content: TipTapJsonContent,
): Promise<void> {
  await database.documents.update(id, { content, updatedAt: new Date() });
}

export async function renameDocument(id: string, title: string): Promise<void> {
  await database.documents.update(id, { title, updatedAt: new Date() });
}

export async function deleteDocument(id: string): Promise<void> {
  await database.documents.delete(id);
}

/* --- Folders ---------------------------------------------------------------- */

export async function listFolders(): Promise<FolderSummary[]> {
  const [folders, documents] = await Promise.all([
    database.folders.toArray(),
    database.documents.toArray(),
  ]);
  return folders
    .map((folder) => ({
      name: folder.name,
      documentCount: documents.filter((d) => d.folderName === folder.name).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFolder(name: string): Promise<void> {
  await database.folders.put({ name });
}

/** Deletes a folder; its documents move back to unfiled (never deleted). */
export async function deleteFolder(name: string): Promise<void> {
  await database.documents.where("folderName").equals(name).modify({ folderName: null });
  await database.folders.delete(name);
}

/** Moving does not bump updatedAt — recency should reflect edits, not filing. */
export async function moveDocumentToFolder(
  id: string,
  folderName: string | null,
): Promise<void> {
  await database.documents.update(id, { folderName });
}
