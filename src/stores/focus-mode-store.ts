import { create } from "zustand";

/**
 * Focus mode: the sidebar, breadcrumbs, and top-bar actions step out of the
 * way so only the document is left.
 *
 * Deliberately NOT persisted — reloading into a chrome-less app with no
 * obvious way back would be a trap.
 */
interface FocusModeState {
  isFocusMode: boolean;
  setFocusMode: (isFocusMode: boolean) => void;
}

export const useFocusModeStore = create<FocusModeState>()((set) => ({
  isFocusMode: false,
  setFocusMode: (isFocusMode) => set({ isFocusMode }),
}));
