import { database } from "@/lib/db/database";
import type { EditorDocument, TipTapJsonContent } from "@/types/document";

/**
 * Browser (IndexedDB/Dexie) storage backend — the fallback used when the app
 * is statically hosted and the file-storage API routes don't exist.
 */

export async function createDocument(title = "Untitled"): Promise<EditorDocument> {
  const now = new Date();
  const document: EditorDocument = {
    id: crypto.randomUUID(),
    title,
    content: null,
    createdAt: now,
    updatedAt: now,
  };
  await database.documents.add(document);
  return document;
}

export async function getDocumentById(id: string): Promise<EditorDocument | undefined> {
  return database.documents.get(id);
}

export async function listDocumentsByRecency(): Promise<EditorDocument[]> {
  // In-memory sort rather than `orderBy("updatedAt")`: autosave rewrites that
  // index constantly, and a primary-key scan is immune to index-mutation edge
  // cases. Document counts are small — sorting in memory is free.
  const documents = await database.documents.toArray();
  return documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
