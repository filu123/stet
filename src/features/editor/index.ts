/**
 * Public API of the `editor` feature.
 * Other features and routes import ONLY from this file — never from internals.
 */
export { EditorScreen } from "./components/EditorScreen";
export {
  exportDocumentAsDocx,
  exportDocumentAsHtml,
  exportDocumentAsMarkdown,
  exportDocumentAsPdf,
  exportDocumentAsPlainText,
} from "./lib/export-service";
export { IMPORTABLE_EXTENSIONS, importFileAsNewDocument } from "./lib/markdown-transfer";
