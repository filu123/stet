/**
 * Public API of the `notes` feature — Google-Docs-style comments anchored to
 * text. Other features (editor) import ONLY from here.
 */
export { NoteMark } from "./lib/note-mark";
export { beginNoteDraft } from "./lib/note-commands";
export { useDocumentNotes } from "./hooks/useDocumentNotes";
export { NotesPanel } from "./components/NotesPanel";
export { NotesToggleButton } from "./components/NotesToggleButton";
export type { AnchoredNote, Note, NoteMessage } from "./lib/note-types";
