import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * File-based document storage for the local server (SERVER-ONLY module).
 *
 * Layout inside the data directory (STET_DATA_DIR, default ~/Stet):
 * - <id>.json               — unfiled document (pretty-printed, lossless)
 * - <slug>.<id8>.md         — human-readable Markdown sibling
 * - <FolderName>/<id>.json  — document inside a folder (folders are REAL
 *   subdirectories; a folder's identity is its directory name)
 *
 * These routes are meant for LOCAL use — the app has no auth. Anyone who can
 * reach the server can read/write the folder.
 */

export interface SerializedDocument {
  id: string;
  title: string;
  content: unknown;
  /** Derived from file location — never persisted inside the JSON. */
  folderName: string | null;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** No path separators, no leading dot, sane length. */
const FOLDER_NAME_PATTERN = /^(?!\.)[^/\\]{1,60}$/;

export function isValidDocumentId(id: string): boolean {
  return DOCUMENT_ID_PATTERN.test(id);
}

export function isValidFolderName(name: string): boolean {
  return FOLDER_NAME_PATTERN.test(name) && name.trim() === name && name !== "";
}

export function getDataDirectory(): string {
  return process.env.STET_DATA_DIR || path.join(os.homedir(), "Stet");
}

async function ensureDataDirectory(): Promise<string> {
  const directory = getDataDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function folderDirectory(root: string, folderName: string | null): string {
  return folderName ? path.join(root, folderName) : root;
}

async function listFolderNames(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && isValidFolderName(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function readDocumentsInDirectory(
  directory: string,
  folderName: string | null,
): Promise<SerializedDocument[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return [];
  }
  const documents: SerializedDocument[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(directory, entry), "utf8");
      const parsed = JSON.parse(raw) as Omit<SerializedDocument, "folderName">;
      if (typeof parsed.id === "string" && isValidDocumentId(parsed.id)) {
        documents.push({ ...parsed, folderName });
      }
    } catch {
      // Unreadable file — skip rather than break the whole list.
    }
  }
  return documents;
}

export async function listDocumentFiles(): Promise<SerializedDocument[]> {
  const root = await ensureDataDirectory();
  const documents = await readDocumentsInDirectory(root, null);
  for (const folderName of await listFolderNames(root)) {
    documents.push(
      ...(await readDocumentsInDirectory(path.join(root, folderName), folderName)),
    );
  }
  return documents;
}

export async function readDocumentFile(id: string): Promise<SerializedDocument | null> {
  const root = await ensureDataDirectory();
  for (const folderName of [null, ...(await listFolderNames(root))]) {
    try {
      const raw = await fs.readFile(
        path.join(folderDirectory(root, folderName), `${id}.json`),
        "utf8",
      );
      const parsed = JSON.parse(raw) as Omit<SerializedDocument, "folderName">;
      return { ...parsed, folderName };
    } catch {
      /* not in this folder */
    }
  }
  return null;
}

/**
 * Upsert: merges the patch over the existing file (or sensible defaults).
 * A `folderName` in the patch MOVES the document (file + md sibling).
 * A folder-only patch (no content/title) does not bump updatedAt.
 */
export async function writeDocumentFile(
  id: string,
  patch: Partial<Omit<SerializedDocument, "id">>,
): Promise<SerializedDocument> {
  const root = await ensureDataDirectory();
  const existing = await readDocumentFile(id);
  const now = new Date().toISOString();

  const targetFolder =
    patch.folderName !== undefined ? patch.folderName : (existing?.folderName ?? null);
  if (targetFolder !== null && !isValidFolderName(targetFolder)) {
    throw new Error("Invalid folder name");
  }

  const isMoveOnly =
    patch.content === undefined && patch.title === undefined && patch.folderName !== undefined;
  const document: SerializedDocument = {
    id,
    title: patch.title ?? existing?.title ?? "Untitled",
    content: patch.content !== undefined ? patch.content : (existing?.content ?? null),
    folderName: targetFolder,
    createdAt: patch.createdAt ?? existing?.createdAt ?? now,
    updatedAt: patch.updatedAt ?? (isMoveOnly ? (existing?.updatedAt ?? now) : now),
  };

  const targetDirectory = folderDirectory(root, targetFolder);
  await fs.mkdir(targetDirectory, { recursive: true });
  // folderName is derived from location — never persisted inside the JSON.
  const persisted = {
    id: document.id,
    title: document.title,
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
  await fs.writeFile(
    path.join(targetDirectory, `${id}.json`),
    JSON.stringify(persisted, null, 2),
    "utf8",
  );

  // Moved out of its previous location? Clean the old files up.
  if (existing && existing.folderName !== targetFolder) {
    const previousDirectory = folderDirectory(root, existing.folderName);
    await fs.rm(path.join(previousDirectory, `${id}.json`), { force: true });
    await removeMarkdownSiblings(previousDirectory, id);
  }

  return document;
}

export async function deleteDocumentFile(id: string): Promise<void> {
  const root = await ensureDataDirectory();
  const existing = await readDocumentFile(id);
  if (!existing) return;
  const directory = folderDirectory(root, existing.folderName);
  await fs.rm(path.join(directory, `${id}.json`), { force: true });
  await removeMarkdownSiblings(directory, id);
}

/** Writes/renames the readable `.md` sibling next to the document's JSON. */
export async function writeMarkdownSibling(
  document: SerializedDocument,
  markdown: string,
): Promise<void> {
  const root = await ensureDataDirectory();
  const directory = folderDirectory(root, document.folderName);
  await removeMarkdownSiblings(directory, document.id);
  const slug =
    document.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "untitled";
  await fs.writeFile(path.join(directory, `${slug}.${idTag(document.id)}.md`), markdown, "utf8");
}

function idTag(id: string): string {
  return id.slice(0, 8);
}

async function removeMarkdownSiblings(directory: string, id: string): Promise<void> {
  const suffix = `.${idTag(id)}.md`;
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(suffix))
      .map((entry) => fs.rm(path.join(directory, entry), { force: true })),
  );
}

/* --- Folder operations ------------------------------------------------------ */

export async function listFolders(): Promise<{ name: string; documentCount: number }[]> {
  const root = await ensureDataDirectory();
  const folders: { name: string; documentCount: number }[] = [];
  for (const name of await listFolderNames(root)) {
    const entries = await fs.readdir(path.join(root, name));
    folders.push({ name, documentCount: entries.filter((e) => e.endsWith(".json")).length });
  }
  return folders;
}

export async function createFolder(name: string): Promise<void> {
  if (!isValidFolderName(name)) throw new Error("Invalid folder name");
  const root = await ensureDataDirectory();
  await fs.mkdir(path.join(root, name), { recursive: true });
}

/** Deletes a folder; its documents move back to the root (never deleted). */
export async function deleteFolder(name: string): Promise<void> {
  if (!isValidFolderName(name)) throw new Error("Invalid folder name");
  const root = await ensureDataDirectory();
  const directory = path.join(root, name);
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return; // already gone
  }
  await Promise.all(
    entries.map((entry) => fs.rename(path.join(directory, entry), path.join(root, entry))),
  );
  await fs.rmdir(directory);
}
