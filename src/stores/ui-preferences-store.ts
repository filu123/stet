import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PageWidth } from "@/types/ui";

/** Small persisted UI preferences (page width, …). */
interface UiPreferencesState {
  pageWidth: PageWidth;
  setPageWidth: (pageWidth: PageWidth) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      pageWidth: "default",
      setPageWidth: (pageWidth) => set({ pageWidth }),
    }),
    { name: "editor-ui-preferences" },
  ),
);
