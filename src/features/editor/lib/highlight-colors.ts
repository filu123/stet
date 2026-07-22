/**
 * The Craft-style highlight pill palette, shared by the bubble menu and the
 * fixed toolbar. Values are theme tokens — dark-mode aware automatically.
 */
export const HIGHLIGHT_COLORS = [
  { name: "yellow", cssValue: "var(--pill-yellow-bg)" },
  { name: "green", cssValue: "var(--pill-green-bg)" },
  { name: "blue", cssValue: "var(--pill-blue-bg)" },
  { name: "purple", cssValue: "var(--pill-purple-bg)" },
  { name: "red", cssValue: "var(--pill-red-bg)" },
] as const;
