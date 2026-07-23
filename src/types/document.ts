import type { JSONContent } from "@tiptap/react";

/**
 * The core document entity, shared across features (documents, editor, ai-assistant).
 *
 * Named `EditorDocument` to avoid clashing with the DOM `Document` type.
 */
export interface EditorDocument {
  /** UUID generated with `crypto.randomUUID()`. */
  id: string;
  title: string;
  /**
   * TipTap JSON — the canonical storage format.
   * Markdown is only an export/import format, never the source of truth.
   * `null` for a freshly created, never-edited document.
   */
  content: TipTapJsonContent | null;
  /**
   * Folder the document lives in (folders are identified by name; in file
   * storage they are real subdirectories of the data dir). `null` = unfiled.
   */
  folderName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A folder as shown in the sidebar. */
export interface FolderSummary {
  name: string;
  documentCount: number;
}

/**
 * Serialized ProseMirror/TipTap document node (type-only import — TipTap owns
 * this schema; we store and pass it through).
 */
export type TipTapJsonContent = JSONContent;
