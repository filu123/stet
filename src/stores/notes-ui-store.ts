import { create } from "zustand";

/** A pending note anchor: the range the user selected before writing the comment. */
export interface NoteDraft {
  from: number;
  to: number;
  quote: string;
}

interface NotesUiState {
  isPanelOpen: boolean;
  /** The note whose card is highlighted/scrolled to. */
  focusedNoteId: string | null;
  /** Non-null while composing the first comment of a new note. */
  draft: NoteDraft | null;

  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  focusNote: (noteId: string | null) => void;
  startDraft: (draft: NoteDraft) => void;
  clearDraft: () => void;
  /** Called when switching documents — drops transient state, keeps the panel pref. */
  resetForDocument: () => void;
}

/**
 * Transient UI state for the notes panel. Kept out of the document model
 * (which lives in the editor) so the bubble menu, panel, and anchor clicks can
 * coordinate without prop drilling.
 */
export const useNotesUiStore = create<NotesUiState>((set) => ({
  isPanelOpen: false,
  focusedNoteId: null,
  draft: null,

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  focusNote: (noteId) => set({ focusedNoteId: noteId }),
  startDraft: (draft) => set({ draft, isPanelOpen: true, focusedNoteId: null }),
  clearDraft: () => set({ draft: null }),
  resetForDocument: () => set({ focusedNoteId: null, draft: null }),
}));
