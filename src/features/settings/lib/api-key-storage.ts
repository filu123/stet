import type { AiProvider } from "../types";

/**
 * API keys live in localStorage ONLY and are read at call time (AGENTS.md).
 * They must never enter a store snapshot, an export, a log, or an error message.
 * The only network destination a key ever reaches is its own provider's API.
 */

const storageKeyFor = (provider: AiProvider) => `editor-api-key:${provider}`;

export function readApiKey(provider: AiProvider): string | null {
  return window.localStorage.getItem(storageKeyFor(provider));
}

export function writeApiKey(provider: AiProvider, apiKey: string): void {
  window.localStorage.setItem(storageKeyFor(provider), apiKey);
}

export function clearApiKey(provider: AiProvider): void {
  window.localStorage.removeItem(storageKeyFor(provider));
}

/** Display-safe form of a stored key: "••••…abcd". Never render the key itself. */
export function maskApiKey(apiKey: string): string {
  return `••••…${apiKey.slice(-4)}`;
}
