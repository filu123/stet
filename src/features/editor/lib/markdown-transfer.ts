import { createDocument, updateDocumentContent } from "@/features/documents";
import type { EditorDocument, TipTapJsonContent } from "@/types/document";

import {
  documentContentToMarkdown,
  htmlToDocumentContent,
  markdownToDocumentContent,
} from "./markdown-serializer";

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

/** File extensions the import button accepts (also used by the file input). */
export const IMPORTABLE_EXTENSIONS = ".md,.markdown,.txt,.html,.htm,.docx";

/**
 * Imports a document file (.md/.txt, .html, .docx) as a new document titled
 * after the filename. Returns the new document's id for navigation.
 */
export async function importFileAsNewDocument(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  let content: TipTapJsonContent;
  try {
    if (["md", "markdown", "txt"].includes(extension)) {
      content = markdownToDocumentContent(await file.text());
    } else if (["html", "htm"].includes(extension)) {
      content = htmlToDocumentContent(await file.text());
    } else if (extension === "docx") {
      // Loaded on demand — mammoth is only paid for by people importing docx.
      const mammoth = await import("mammoth/mammoth.browser");
      const { value: html } = await mammoth.convertToHtml({
        arrayBuffer: await file.arrayBuffer(),
      });
      content = htmlToDocumentContent(html);
    } else {
      throw new Error(
        `".${extension}" files aren't supported — use Markdown, text, HTML, or Word (.docx).`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("aren't supported")) throw error;
    throw new Error("This file could not be read. Is it a valid document?");
  }

  const title =
    file.name.replace(/\.(md|markdown|txt|html|htm|docx)$/i, "").trim() || "Imported document";
  const editorDocument = await createDocument(title);
  await updateDocumentContent(editorDocument.id, content);
  return editorDocument.id;
}
