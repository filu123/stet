/**
 * Public API of the `documents` feature.
 * Other features and routes import ONLY from this file — never from internals.
 */
export { DocumentTitleInput } from "./components/DocumentTitleInput";
export { SaveStatusIndicator } from "./components/SaveStatusIndicator";
export { SidebarDocumentList } from "./components/SidebarDocumentList";
export { useActiveDocumentId } from "./hooks/useActiveDocumentId";
export { useDocument } from "./hooks/useDocument";
export { useOpenMostRecentDocument } from "./hooks/useOpenMostRecentDocument";
export {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocumentsByRecency,
  renameDocument,
  updateDocumentContent,
} from "./lib/document-repository";
