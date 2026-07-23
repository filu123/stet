import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * File-based document storage for the local server (SERVER-ONLY module).
 *
 * Layout inside the data directory (STET_DATA_DIR, default ~/Stet):
 * - <id>.json          — canonical document (pretty-printed, lossless)
 * - <slug>.<id8>.md    — human-readable Markdown sibling, named by title
 *
 * These routes are meant for LOCAL use — the app has no auth. Anyone who can
 * reach the server can read/write the folder.
 */

export interface SerializedDocument {
  id: string;
  title: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDocumentId(id: string): boolean {
  return DOCUMENT_ID_PATTERN.test(id);
}

export function getDataDirectory(): string {
  return process.env.STET_DATA_DIR || path.join(os.homedir(), "Stet");
}

async function ensureDataDirectory(): Promise<string> {
  const directory = getDataDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function documentPath(directory: string, id: string): string {
  return path.join(directory, `${id}.json`);
}

export async function listDocumentFiles(): Promise<SerializedDocument[]> {
  const directory = await ensureDataDirectory();
  const entries = await fs.readdir(directory);
  const documents: SerializedDocument[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(directory, entry), "utf8");
      const parsed = JSON.parse(raw) as SerializedDocument;
      if (typeof parsed.id === "string" && isValidDocumentId(parsed.id)) {
        documents.push(parsed);
      }
    } catch {
      // Unreadable file — skip rather than break the whole list.
    }
  }
  return documents;
}

export async function readDocumentFile(id: string): Promise<SerializedDocument | null> {
  const directory = await ensureDataDirectory();
  try {
    const raw = await fs.readFile(documentPath(directory, id), "utf8");
    return JSON.parse(raw) as SerializedDocument;
  } catch {
    return null;
  }
}

/** Upsert: merges the patch over the existing file (or sensible defaults). */
export async function writeDocumentFile(
  id: string,
  patch: Partial<Omit<SerializedDocument, "id">>,
): Promise<SerializedDocument> {
  const directory = await ensureDataDirectory();
  const existing = await readDocumentFile(id);
  const now = new Date().toISOString();
  const document: SerializedDocument = {
    id,
    title: patch.title ?? existing?.title ?? "Untitled",
    content: patch.content !== undefined ? patch.content : (existing?.content ?? null),
    createdAt: patch.createdAt ?? existing?.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now,
  };
  await fs.writeFile(documentPath(directory, id), JSON.stringify(document, null, 2), "utf8");
  return document;
}

export async function deleteDocumentFile(id: string): Promise<void> {
  const directory = await ensureDataDirectory();
  await fs.rm(documentPath(directory, id), { force: true });
  await removeMarkdownSiblings(directory, id);
}

/** Writes/renames the readable `.md` sibling for a document. */
export async function writeMarkdownSibling(
  document: SerializedDocument,
  markdown: string,
): Promise<void> {
  const directory = await ensureDataDirectory();
  await removeMarkdownSiblings(directory, document.id);
  const slug =
    document.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "untitled";
  await fs.writeFile(
    path.join(directory, `${slug}.${idTag(document.id)}.md`),
    markdown,
    "utf8",
  );
}

function idTag(id: string): string {
  return id.slice(0, 8);
}

async function removeMarkdownSiblings(directory: string, id: string): Promise<void> {
  const suffix = `.${idTag(id)}.md`;
  const entries = await fs.readdir(directory);
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(suffix))
      .map((entry) => fs.rm(path.join(directory, entry), { force: true })),
  );
}
