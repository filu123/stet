import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PageWidth, ThemeId } from "@/types/ui";

/** Small persisted UI preferences (page width, theme, …). */
interface UiPreferencesState {
  pageWidth: PageWidth;
  theme: ThemeId;
  setPageWidth: (pageWidth: PageWidth) => void;
  setTheme: (theme: ThemeId) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      pageWidth: "default",
      theme: "system",
      setPageWidth: (pageWidth) => set({ pageWidth }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "editor-ui-preferences" },
  ),
);
