import { generateHTML } from "@tiptap/core";

import type { EditorDocument } from "@/types/document";

import { buildEditorExtensions } from "./editor-extensions";
import { documentContentToMarkdown, documentContentToPlainText } from "./markdown-serializer";

/**
 * Export in every supported format. Downloads happen client-side; the
 * document JSON stays the canonical source.
 */

/** Theme-token → light-mode literal, for exports that leave the app's CSS. */
const TOKEN_HEX: Record<string, string> = {
  "var(--pill-yellow-bg)": "#fdf1a7",
  "var(--pill-green-bg)": "#c9ecd4",
  "var(--pill-blue-bg)": "#cfe5fb",
  "var(--pill-purple-bg)": "#e4d8f9",
  "var(--pill-red-bg)": "#fbd3d0",
  "var(--mark-red)": "#e0453a",
  "var(--mark-amber)": "#b98a00",
  "var(--mark-blue)": "#0a7cff",
  "var(--mark-green)": "#1f9e54",
  "var(--mark-purple)": "#7c4dff",
};

export function replaceTokenColors(html: string): string {
  return Object.entries(TOKEN_HEX).reduce(
    (result, [token, hex]) => result.replaceAll(token, hex),
    html,
  );
}

function downloadFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportDocumentAsMarkdown(editorDocument: EditorDocument): void {
  const markdown = documentContentToMarkdown(editorDocument.content);
  downloadFile(`${editorDocument.title}.md`, new Blob([markdown], { type: "text/markdown" }));
}

export function exportDocumentAsPlainText(editorDocument: EditorDocument): void {
  const text = documentContentToPlainText(editorDocument.content);
  downloadFile(`${editorDocument.title}.txt`, new Blob([text], { type: "text/plain" }));
}

export function exportDocumentAsHtml(editorDocument: EditorDocument): void {
  downloadFile(
    `${editorDocument.title}.html`,
    new Blob([buildStandaloneHtml(editorDocument)], { type: "text/html" }),
  );
}

/**
 * PDF via the browser's print dialog — no bundled PDF engine. Opens the styled
 * HTML in a new window and triggers print; the user picks "Save as PDF".
 */
export function exportDocumentAsPdf(editorDocument: EditorDocument): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Allow pop-ups to export as PDF, then try again.");
    return;
  }
  printWindow.document.write(buildStandaloneHtml(editorDocument, { forPrint: true }));
  printWindow.document.close();
}

function buildStandaloneHtml(
  editorDocument: EditorDocument,
  options: { forPrint?: boolean } = {},
): string {
  const bodyHtml = editorDocument.content
    ? // Absolutize on-disk image srcs so they still resolve in a standalone file.
      replaceTokenColors(generateHTML(editorDocument.content, buildEditorExtensions())).replaceAll(
        'src="/api/',
        `src="${window.location.origin}/api/`,
      )
    : "";
  const printScript = options.forPrint
    ? `<script>window.onload = () => { window.focus(); window.print(); };</scr` + `ipt>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(editorDocument.title)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; line-height: 1.75; max-width: 720px; margin: 48px auto; padding: 0 24px; color: #171923; }
  h1:first-of-type { margin-top: 0; }
  mark { border-radius: 4px; padding: 0.05em 0.2em; }
  .user-circle { border: 1.5px solid #0a7cff; border-radius: 10px; padding: 0.05em 0.2em; }
  blockquote { border-left: 3px solid #d5d8e0; padding-left: 1rem; color: #5d6470; margin-left: 0; }
  pre { background: #f4f5f9; border-radius: 10px; padding: 0.875rem 1rem; overflow-x: auto; }
  code { font-family: ui-monospace, monospace; font-size: 0.9em; }
  .page-break { border-top: 1.5px dashed #d5d8e0; margin: 2rem 0; }
  @media print { .page-break { border: none; break-after: page; } }
</style>
</head>
<body>
<h1>${escapeHtml(editorDocument.title)}</h1>
${bodyHtml}
${printScript}
</body>
</html>`;
}

export async function exportDocumentAsDocx(editorDocument: EditorDocument): Promise<void> {
  // Heavy converter loaded on demand — only Word exporters pay for it.
  const { buildDocxBlob } = await import("./docx-export");
  downloadFile(`${editorDocument.title}.docx`, await buildDocxBlob(editorDocument));
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
