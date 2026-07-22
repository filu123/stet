import { database } from "@/lib/db/database";
import type { EditorDocument, TipTapJsonContent } from "@/types/document";

/**
 * The ONLY module allowed to touch the `documents` table.
 * Components and hooks talk to documents exclusively through these functions.
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

/**
 * Creates a first document if the database is empty.
 * Runs in a transaction so concurrent calls (e.g. React Strict Mode running an
 * effect twice) can never create duplicates.
 */
export async function ensureDocumentExists(): Promise<void> {
  await database.transaction("rw", database.documents, async () => {
    const documentCount = await database.documents.count();
    if (documentCount === 0) {
      await createDocument();
    }
  });
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
