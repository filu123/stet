"use client";

import { useEffect } from "react";

import { resolveThemeAttribute } from "@/lib/themes";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";

/**
 * Keeps <html data-theme> in sync with the stored preference.
 * (First paint is handled by the inline script in layout.tsx — this component
 * takes over from there and also follows OS changes in "system" mode.)
 */
export function ThemeApplier() {
  const theme = useUiPreferencesStore((state) => state.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveThemeAttribute(theme, media.matches);
    };
    applyTheme();
    if (theme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  return null;
}
