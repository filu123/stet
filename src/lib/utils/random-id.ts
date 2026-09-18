/**
 * A UUID for documents, notes, and AI suggestions.
 *
 * `crypto.randomUUID()` is secure-context-only, so it is `undefined` when Stet
 * is served over plain http to another device on the LAN (e.g. a tablet at
 * `http://192.168.x.x:3000`). Falling back keeps those sessions working —
 * ids are local identifiers, never security tokens, so a weaker source is fine.
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC-4122-shaped v4, from getRandomValues where available.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
