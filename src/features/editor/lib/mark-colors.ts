/**
 * Stroke colors for user-applied underlines and circles — stronger than the
 * highlight pill backgrounds. Values are theme tokens, dark-mode aware.
 */
export const MARK_COLORS = [
  { name: "red", cssValue: "var(--mark-red)" },
  { name: "amber", cssValue: "var(--mark-amber)" },
  { name: "blue", cssValue: "var(--mark-blue)" },
  { name: "green", cssValue: "var(--mark-green)" },
  { name: "purple", cssValue: "var(--mark-purple)" },
] as const;
