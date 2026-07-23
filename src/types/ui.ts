/** Document page width preference. "free" = user-dragged custom width. */
export type PageWidth = "default" | "wide" | "free";

/** Color theme. "system" follows the OS light/dark preference. */
export type ThemeId = "system" | "light" | "dark" | "reading" | "forest" | "midnight";

/** Continuous scroll (default) or visual page guides at paper-height intervals. */
export type PageLayout = "continuous" | "pages";

/** Paper size for page guides and print. */
export type PaperSize = "a4" | "letter";

/** Editor text size. */
export type EditorFontSize = "small" | "default" | "large";
