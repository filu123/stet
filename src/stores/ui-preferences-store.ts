import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  DocumentFont,
  EditorFontSize,
  PageLayout,
  PageWidth,
  PaperSize,
  ThemeId,
} from "@/types/ui";

/** Free-form width bounds (px). Max is clamped live to the toolbar width. */
export const FREE_WIDTH_MIN = 525;

/** Small persisted UI preferences (page width, theme, page setup, …). */
interface UiPreferencesState {
  pageWidth: PageWidth;
  /** Custom page width in px, used when pageWidth === "free". */
  freeWidth: number;
  theme: ThemeId;
  pageLayout: PageLayout;
  paperSize: PaperSize;
  fontSize: EditorFontSize;
  fontFamily: DocumentFont;
  setPageWidth: (pageWidth: PageWidth) => void;
  setFreeWidth: (freeWidth: number) => void;
  setTheme: (theme: ThemeId) => void;
  setPageLayout: (pageLayout: PageLayout) => void;
  setPaperSize: (paperSize: PaperSize) => void;
  setFontSize: (fontSize: EditorFontSize) => void;
  setFontFamily: (fontFamily: DocumentFont) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      pageWidth: "default",
      freeWidth: 720,
      theme: "system",
      pageLayout: "continuous",
      paperSize: "a4",
      fontSize: "default",
      fontFamily: "sans",
      setPageWidth: (pageWidth) => set({ pageWidth }),
      setFreeWidth: (freeWidth) => set({ freeWidth: Math.max(FREE_WIDTH_MIN, freeWidth) }),
      setTheme: (theme) => set({ theme }),
      setPageLayout: (pageLayout) => set({ pageLayout }),
      setPaperSize: (paperSize) => set({ paperSize }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
    }),
    {
      name: "editor-ui-preferences",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<UiPreferencesState>;
        // v0 had a "narrow" width option — folded into "default".
        if (!["default", "wide", "free"].includes(state.pageWidth as string)) {
          state.pageWidth = "default";
        }
        // v1 → v2 added a document font.
        if (!["sans", "serif", "mono", "rounded"].includes(state.fontFamily as string)) {
          state.fontFamily = "sans";
        }
        return state;
      },
    },
  ),
);
