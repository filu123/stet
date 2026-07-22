/**
 * Public API of the `editor` feature.
 * Other features and routes import ONLY from this file — never from internals.
 */
export { EditorScreen } from "./components/EditorScreen";
export {
  exportDocumentAsMarkdown,
  importMarkdownAsNewDocument,
} from "./lib/markdown-transfer";
