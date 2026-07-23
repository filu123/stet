import type { EditorDocument, FolderSummary, TipTapJsonContent } from "@/types/document";

/**
 * File storage backend — talks to the local server's /api routes, which
 * persist each document as a JSON file (+ Markdown sibling) on disk; folders
 * are real subdirectories of the data dir.
 */

interface SerializedDocument {
  id: string;
  title: string;
  content: TipTapJsonContent | null;
  folderName?: string | null;
  createdAt: string;
  updatedAt: string;
}

function reviveDocument(serialized: SerializedDocument): EditorDocument {
  return {
    ...serialized,
    folderName: serialized.folderName ?? null,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
  };
}

async function putDocumentPatch(
  id: string,
  patch: Partial<Omit<SerializedDocument, "id">>,
): Promise<SerializedDocument> {
  const response = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Saving the document failed (HTTP ${response.status}).`);
  return (await response.json()) as SerializedDocument;
}

export async function createDocument(title = "Untitled"): Promise<EditorDocument> {
  const now = new Date().toISOString();
  const saved = await putDocumentPatch(crypto.randomUUID(), {
    title,
    content: null,
    createdAt: now,
    updatedAt: now,
  });
  return reviveDocument(saved);
}

export async function getDocumentById(id: string): Promise<EditorDocument | undefined> {
  const response = await fetch(`/api/documents/${id}`, { cache: "no-store" });
  if (response.status === 404 || response.status === 400) return undefined;
  if (!response.ok) throw new Error(`Loading the document failed (HTTP ${response.status}).`);
  return reviveDocument((await response.json()) as SerializedDocument);
}

export async function listDocumentsByRecency(): Promise<EditorDocument[]> {
  const response = await fetch("/api/documents", { cache: "no-store" });
  if (!response.ok) throw new Error(`Loading documents failed (HTTP ${response.status}).`);
  const documents = ((await response.json()) as SerializedDocument[]).map(reviveDocument);
  return documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function updateDocumentContent(
  id: string,
  content: TipTapJsonContent,
): Promise<void> {
  await putDocumentPatch(id, { content, updatedAt: new Date().toISOString() });
}

export async function renameDocument(id: string, title: string): Promise<void> {
  await putDocumentPatch(id, { title, updatedAt: new Date().toISOString() });
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Deleting the document failed (HTTP ${response.status}).`);
}

/** Full upsert — used by the one-time IndexedDB → files migration. */
export async function putFullDocument(document: EditorDocument): Promise<void> {
  await putDocumentPatch(document.id, {
    title: document.title,
    content: document.content,
    folderName: document.folderName,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  });
}

/* --- Folders ---------------------------------------------------------------- */

export async function listFolders(): Promise<FolderSummary[]> {
  const response = await fetch("/api/folders", { cache: "no-store" });
  if (!response.ok) throw new Error(`Loading folders failed (HTTP ${response.status}).`);
  return (await response.json()) as FolderSummary[];
}

export async function createFolder(name: string): Promise<void> {
  const response = await fetch("/api/folders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`Creating the folder failed (HTTP ${response.status}).`);
}

export async function deleteFolder(name: string): Promise<void> {
  const response = await fetch(`/api/folders/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Deleting the folder failed (HTTP ${response.status}).`);
}

export async function moveDocumentToFolder(
  id: string,
  folderName: string | null,
): Promise<void> {
  await putDocumentPatch(id, { folderName });
}
