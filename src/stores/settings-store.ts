import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AiSettings } from "@/types/ai";

/**
 * Non-secret AI settings, persisted to localStorage.
 * API keys are intentionally NOT here — they live in the settings feature's
 * api-key-storage and are read at call time only (AGENTS.md).
 */
interface SettingsState extends AiSettings {
  updateSettings: (settings: AiSettings) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      provider: "anthropic",
      // Keep in sync with PROVIDER_CATALOG.anthropic.defaultModel
      // (not imported — stores must not depend on feature internals).
      model: "claude-opus-4-8",
      mode: "on-demand",
      updateSettings: (settings) => set(settings),
    }),
    { name: "editor-ai-settings" },
  ),
);
