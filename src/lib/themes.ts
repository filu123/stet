import type { ThemeId } from "@/types/ui";

/**
 * Theme catalog for the picker UI. Preview colors are literal (they must show
 * OTHER themes' colors regardless of the active theme) — the actual theme
 * tokens live in globals.css under [data-theme="…"].
 */
export interface ThemeInfo {
  id: ThemeId;
  label: string;
  previewBackground: string;
  previewAccent: string;
}

export const THEMES: readonly ThemeInfo[] = [
  {
    id: "system",
    label: "System",
    previewBackground: "linear-gradient(135deg, #f5f6fb 50%, #131419 50%)",
    previewAccent: "#4f46e5",
  },
  { id: "light", label: "Light", previewBackground: "#f5f6fb", previewAccent: "#4f46e5" },
  { id: "dark", label: "Dark", previewBackground: "#1c1d24", previewAccent: "#837dff" },
  { id: "reading", label: "Reading", previewBackground: "#f8f1e2", previewAccent: "#a5622a" },
  { id: "forest", label: "Forest", previewBackground: "#eef4ee", previewAccent: "#1f7a4d" },
  { id: "midnight", label: "Midnight", previewBackground: "#171e33", previewAccent: "#82aaff" },
];

/** Resolves the stored theme to the attribute set on <html>. */
export function resolveThemeAttribute(theme: ThemeId, prefersDark: boolean): string {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}
