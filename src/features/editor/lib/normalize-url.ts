/**
 * Turns loose user input into a safe href, or null if it can't be one.
 * Adds `https://` when no scheme is present; rejects javascript:/data: etc.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme =
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const url = new URL(withScheme, "https://placeholder.invalid");
    if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return null;
    return withScheme;
  } catch {
    return null;
  }
}
