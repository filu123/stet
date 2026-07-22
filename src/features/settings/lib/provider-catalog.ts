import type { AiProvider, ProviderInfo } from "../types";

/**
 * Supported AI providers. Model lists are suggestions (verified July 2026) —
 * the settings UI keeps the model field editable so newly released models
 * work without an app update.
 */
export const PROVIDER_CATALOG: Record<AiProvider, ProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-opus-4-8",
    suggestedModels: ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"],
    keyPlaceholder: "sk-ant-…",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-5.1",
    suggestedModels: ["gpt-5.1", "gpt-5.1-mini", "gpt-4o"],
    keyPlaceholder: "sk-…",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-3.6-flash",
    suggestedModels: [
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-2.5-pro",
    ],
    keyPlaceholder: "AIza…",
  },
};

export const ALL_PROVIDERS: readonly ProviderInfo[] = Object.values(PROVIDER_CATALOG);
