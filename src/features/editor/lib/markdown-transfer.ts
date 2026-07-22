import { createDocument, updateDocumentContent } from "@/features/documents";
import type { EditorDocument, TipTapJsonContent } from "@/types/document";

import { documentContentToMarkdown, markdownToDocumentContent } from "./markdown-serializer";

/** Downloads the document as a `.md` file named after its title. */
export function exportDocumentAsMarkdown(editorDocument: EditorDocument): void {
  const markdown = documentContentToMarkdown(editorDocument.content);
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${editorDocument.title}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports a `.md` file as a new document (titled after the filename).
 * Returns the new document's id for navigation.
 */
export async function importMarkdownAsNewDocument(file: File): Promise<string> {
  const markdown = await file.text();

  let content: TipTapJsonContent;
  try {
    content = markdownToDocumentContent(markdown);
  } catch {
    throw new Error("This file could not be read as Markdown.");
  }

  const title = file.name.replace(/\.(md|markdown|txt)$/i, "").trim() || "Imported document";
  const editorDocument = await createDocument(title);
  await updateDocumentContent(editorDocument.id, content);
  return editorDocument.id;
}
