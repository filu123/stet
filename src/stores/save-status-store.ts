import { create } from "zustand";

/**
 * Autosave status, shared between distant components: the editor's autosave
 * hook writes it, the TopBar indicator reads it.
 */
export type SaveStatus = "idle" | "saving" | "saved";

interface SaveStatusState {
  status: SaveStatus;
  setStatus: (status: SaveStatus) => void;
}

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  status: "idle",
  setStatus: (status) => set({ status }),
}));
