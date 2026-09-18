import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Matches HIGHLIGHT_COLORS[0]; a literal so this store stays feature-agnostic. */
const DEFAULT_PEN_COLOR = "var(--pill-yellow-bg)";

/**
 * Stylus markup state, shared between the ProseMirror plugin (which reads it
 * imperatively at stroke start) and the floating palette component.
 *
 * `isPenDetected` is session-only: the palette must not appear on a laptop
 * just because the user once opened the document on a tablet.
 */
interface PenMarkupState {
  /** Highlight color a pen stroke applies, as a theme token. */
  color: string;
  /** When true, strokes remove highlights of any color instead of applying one. */
  isEraser: boolean;
  /** Set once a stylus is seen (hover or contact) in this session. */
  isPenDetected: boolean;
  setColor: (color: string) => void;
  setEraser: (isEraser: boolean) => void;
  markPenDetected: () => void;
}

export const usePenMarkupStore = create<PenMarkupState>()(
  persist(
    (set) => ({
      color: DEFAULT_PEN_COLOR,
      isEraser: false,
      isPenDetected: false,
      setColor: (color) => set({ color, isEraser: false }),
      setEraser: (isEraser) => set({ isEraser }),
      markPenDetected: () => set({ isPenDetected: true }),
    }),
    {
      name: "pen-markup",
      version: 1,
      // Only the tool choice is worth remembering across sessions.
      partialize: (state) => ({ color: state.color }),
    },
  ),
);
