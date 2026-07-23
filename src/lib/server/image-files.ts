import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getDataDirectory } from "./document-files";

/**
 * Image storage for the local server (SERVER-ONLY). Images live in
 * `<STET_DATA_DIR>/images/<uuid>.<ext>` — beside the documents, so a user's
 * whole library (prose + pictures) moves and backs up as one folder.
 */

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const IMAGE_NAME_PATTERN = /^[0-9a-f-]{36}\.(png|jpg|jpeg|gif|webp|svg)$/i;

export function isSupportedImageType(mimeType: string): boolean {
  return mimeType in EXTENSION_BY_TYPE;
}

export function isValidImageName(name: string): boolean {
  return IMAGE_NAME_PATTERN.test(name);
}

function imagesDirectory(): string {
  return path.join(getDataDirectory(), "images");
}

/** Persists image bytes and returns the public filename (`<uuid>.<ext>`). */
export async function saveImageFile(bytes: Buffer, mimeType: string): Promise<string> {
  const extension = EXTENSION_BY_TYPE[mimeType];
  if (!extension) throw new Error(`Unsupported image type: ${mimeType}`);

  const directory = imagesDirectory();
  await fs.mkdir(directory, { recursive: true });

  const name = `${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(directory, name), bytes);
  return name;
}

interface StoredImage {
  bytes: Buffer;
  contentType: string;
}

export async function readImageFile(name: string): Promise<StoredImage | null> {
  if (!isValidImageName(name)) return null;
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  try {
    const bytes = await fs.readFile(path.join(imagesDirectory(), name));
    return { bytes, contentType: TYPE_BY_EXTENSION[extension] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
