import Dexie, { type EntityTable } from "dexie";

import type { EditorDocument } from "@/types/document";

/**
 * The local-first IndexedDB database (via Dexie).
 *
 * Access rules (see AGENTS.md):
 * - Components must NEVER import this file directly.
 * - All reads/writes go through the data layer in `features/documents/lib/`
 *   (or a future feature-specific data layer), so persistence stays swappable.
 *
 * Schema changes require a new `.version(n)` block with an upgrade path —
 * never edit an existing version in place once released.
 */
export const database = new Dexie("opensource-editor-ai") as Dexie & {
  documents: EntityTable<EditorDocument, "id">;
};

database.version(1).stores({
  // Indexed fields only — non-indexed fields (content, createdAt) are still stored.
  documents: "id, title, updatedAt",
});
