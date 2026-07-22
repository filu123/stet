import type { AiProvider } from "@/types/ai";

export type { AiAssistantMode, AiProvider, AiSettings } from "@/types/ai";

export interface ProviderInfo {
  id: AiProvider;
  label: string;
  defaultModel: string;
  /** Shown as suggestions — the model field stays free-text so new models work without an app update. */
  suggestedModels: readonly string[];
  keyPlaceholder: string;
}
