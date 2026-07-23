import type { Editor } from "@tiptap/react";

import { getStorageInfo } from "@/features/documents";

const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

/**
 * Stores an image and returns its `src`. In file mode it lives on disk beside
 * the documents (served from `/api/images`); with browser storage there's no
 * server, so it's embedded as a data URL.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new Error("That image type isn't supported — use PNG, JPEG, GIF, WebP, or SVG.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("That image is too large (max 10MB).");
  }

  const { mode } = await getStorageInfo();
  if (mode === "files") {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/images", { method: "POST", body });
    if (!response.ok) throw new Error("The image upload failed. Try again.");
    const { url } = (await response.json()) as { url: string };
    return url;
  }

  return readAsDataUrl(file);
}

/**
 * Uploads and inserts image files into the editor. When `position` is given
 * (a drop point) they land there; otherwise at the cursor.
 */
export async function insertImageFiles(
  editor: Editor,
  files: FileList | File[],
  position?: number,
): Promise<void> {
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
  for (const file of imageFiles) {
    try {
      const src = await uploadImage(file);
      if (typeof position === "number") {
        editor.chain().focus().insertContentAt(position, { type: "image", attrs: { src } }).run();
      } else {
        editor.chain().focus().setImage({ src }).run();
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Couldn't add the image.");
    }
  }
}
