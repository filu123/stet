import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { EditorFontSize, PageLayout, PageWidth, PaperSize, ThemeId } from "@/types/ui";

/** Small persisted UI preferences (page width, theme, page setup, …). */
interface UiPreferencesState {
  pageWidth: PageWidth;
  theme: ThemeId;
  pageLayout: PageLayout;
  paperSize: PaperSize;
  fontSize: EditorFontSize;
  setPageWidth: (pageWidth: PageWidth) => void;
  setTheme: (theme: ThemeId) => void;
  setPageLayout: (pageLayout: PageLayout) => void;
  setPaperSize: (paperSize: PaperSize) => void;
  setFontSize: (fontSize: EditorFontSize) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      pageWidth: "default",
      theme: "system",
      pageLayout: "continuous",
      paperSize: "a4",
      fontSize: "default",
      setPageWidth: (pageWidth) => set({ pageWidth }),
      setTheme: (theme) => set({ theme }),
      setPageLayout: (pageLayout) => set({ pageLayout }),
      setPaperSize: (paperSize) => set({ paperSize }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: "editor-ui-preferences" },
  ),
);
