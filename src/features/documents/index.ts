/**
 * Public API of the `documents` feature.
 * Other features and routes import ONLY from this file — never from internals.
 */
export { DocumentsLibrary } from "./components/DocumentsLibrary";
export { DocumentTitleInput } from "./components/DocumentTitleInput";
export { HomeScreen } from "./components/HomeScreen";
export { SaveStatusIndicator } from "./components/SaveStatusIndicator";
export { SidebarDocumentList } from "./components/SidebarDocumentList";
export { useActiveDocumentId } from "./hooks/useActiveDocumentId";
export { useDocument } from "./hooks/useDocument";
export {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocumentsByRecency,
  renameDocument,
  updateDocumentContent,
} from "./lib/document-repository";
export { getStorageInfo, type StorageInfo } from "./lib/storage-backend";
