/**
 * Public API of the `settings` feature.
 * Other features and routes import ONLY from this file — never from internals.
 */
export { SettingsDialog } from "./components/SettingsDialog";
export { readApiKey } from "./lib/api-key-storage";
export { PROVIDER_CATALOG } from "./lib/provider-catalog";
