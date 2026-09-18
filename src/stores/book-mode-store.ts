import { create } from "zustand";

/**
 * Book mode: the document is cut into screen-sized sheets you turn instead of
 * scroll, Kindle-style. It rides on top of focus mode (chrome out of the way,
 * browser fullscreen), so the two are entered and left together — see
 * `enterBookMode` / `leaveFocusMode` in the layout components.
 *
 * Like focus mode, deliberately NOT persisted: reloading straight into a
 * chrome-less reader with no obvious way out would be a trap.
 */
interface BookModeState {
  isBookMode: boolean;
  setBookMode: (isBookMode: boolean) => void;
}

export const useBookModeStore = create<BookModeState>()((set) => ({
  isBookMode: false,
  setBookMode: (isBookMode) => set({ isBookMode }),
}));
