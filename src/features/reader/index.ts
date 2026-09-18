/**
 * Public API of the `reader` feature.
 * Other features and routes import ONLY from this file — never from internals.
 *
 * The reader is a separate world from the document editor: its own storage,
 * its own routes, no ProseMirror. Books are read, not written.
 */
export { LibraryScreen } from "./components/LibraryScreen";
export { ReaderScreen } from "./components/ReaderScreen";
