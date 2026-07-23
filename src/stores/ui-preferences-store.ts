import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { EditorFontSize, PageLayout, PageWidth, PaperSize, ThemeId } from "@/types/ui";

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
  setPageWidth: (pageWidth: PageWidth) => void;
  setFreeWidth: (freeWidth: number) => void;
  setTheme: (theme: ThemeId) => void;
  setPageLayout: (pageLayout: PageLayout) => void;
  setPaperSize: (paperSize: PaperSize) => void;
  setFontSize: (fontSize: EditorFontSize) => void;
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
      setPageWidth: (pageWidth) => set({ pageWidth }),
      setFreeWidth: (freeWidth) => set({ freeWidth: Math.max(FREE_WIDTH_MIN, freeWidth) }),
      setTheme: (theme) => set({ theme }),
      setPageLayout: (pageLayout) => set({ pageLayout }),
      setPaperSize: (paperSize) => set({ paperSize }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: "editor-ui-preferences",
      version: 1,
      migrate: (persisted) => {
        // v0 had a "narrow" width option — folded into "default".
        const state = persisted as Partial<UiPreferencesState>;
        if (!["default", "wide", "free"].includes(state.pageWidth as string)) {
          state.pageWidth = "default";
        }
        return state;
      },
    },
  ),
);
