"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils/cn";
import { THEMES } from "@/lib/themes";
import { useSettingsStore } from "@/stores/settings-store";
import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import type { AiAssistantMode, AiProvider } from "@/types/ai";

import { clearApiKey, maskApiKey, readApiKey, writeApiKey } from "../lib/api-key-storage";
import { ALL_PROVIDERS, PROVIDER_CATALOG } from "../lib/provider-catalog";
import { testProviderConnection, type ConnectionTestResult } from "../lib/test-connection";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConnectionTestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "done"; result: ConnectionTestResult };

/**
 * AI settings: provider, model, BYO API key, assistant mode.
 * Draft state is local — nothing is persisted until Save.
 * The form mounts fresh each time the dialog opens (no state syncing).
 */
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  if (!isOpen) return null;
  return <SettingsDialogForm onClose={onClose} />;
}

function SettingsDialogForm({ onClose }: { onClose: () => void }) {
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const activeTheme = useUiPreferencesStore((state) => state.theme);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);

  const [provider, setProvider] = useState<AiProvider>(() => useSettingsStore.getState().provider);
  const [model, setModel] = useState(() => useSettingsStore.getState().model);
  const [mode, setMode] = useState<AiAssistantMode>(() => useSettingsStore.getState().mode);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [storedKeyMask, setStoredKeyMask] = useState<string | null>(() => {
    const savedKey = readApiKey(useSettingsStore.getState().provider);
    return savedKey ? maskApiKey(savedKey) : null;
  });
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>({ status: "idle" });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const providerInfo = PROVIDER_CATALOG[provider];

  const handleProviderChange = (nextProvider: AiProvider) => {
    setProvider(nextProvider);
    setModel(PROVIDER_CATALOG[nextProvider].defaultModel);
    setApiKeyInput("");
    setConnectionTest({ status: "idle" });
    const savedKey = readApiKey(nextProvider);
    setStoredKeyMask(savedKey ? maskApiKey(savedKey) : null);
  };

  const handleRemoveKey = () => {
    clearApiKey(provider);
    setStoredKeyMask(null);
    setApiKeyInput("");
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKeyInput.trim() || readApiKey(provider);
    if (!keyToTest) {
      setConnectionTest({
        status: "done",
        result: { isSuccess: false, message: "Enter an API key first." },
      });
      return;
    }
    setConnectionTest({ status: "testing" });
    const result = await testProviderConnection(provider, keyToTest, model.trim());
    setConnectionTest({ status: "done", result });
  };

  const handleSave = () => {
    updateSettings({ provider, model: model.trim(), mode });
    const trimmedKey = apiKeyInput.trim();
    if (trimmedKey) writeApiKey(provider, trimmedKey);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="overlay-fade absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />

      <div className="dialog-pop relative w-full max-w-md rounded-card border border-border-subtle bg-surface-card p-6">
        <h2 className="text-base font-semibold">AI settings</h2>
        <p className="mt-1 text-sm text-content-tertiary">
          Your key is stored only in this browser and sent only to the provider you choose.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-content-secondary">
              Theme <span className="font-normal text-content-tertiary">(applies instantly)</span>
            </span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Theme">
              {THEMES.map((themeInfo) => (
                <button
                  key={themeInfo.id}
                  type="button"
                  role="radio"
                  aria-checked={themeInfo.id === activeTheme}
                  onClick={() => setTheme(themeInfo.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    themeInfo.id === activeTheme
                      ? "border-accent text-accent"
                      : "border-border-subtle text-content-secondary hover:bg-surface-hover",
                  )}
                >
                  <span
                    className="size-3.5 rounded-full border border-border-subtle"
                    style={{ background: themeInfo.previewBackground }}
                    aria-hidden
                  >
                    <span
                      className="mt-[3px] ml-[3px] block size-1.5 rounded-full"
                      style={{ background: themeInfo.previewAccent }}
                    />
                  </span>
                  {themeInfo.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-content-secondary">Provider</span>
            <SegmentedControl
              aria-label="AI provider"
              options={ALL_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
              value={provider}
              onChange={handleProviderChange}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-content-secondary">Model</span>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                spellCheck={false}
                aria-label="Model name"
                className="rounded-lg border border-border-subtle bg-surface-app px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            {/* Always-visible suggestions — free text above still allows any model */}
            <div className="flex flex-wrap gap-1.5">
              {providerInfo.suggestedModels.map((suggestedModel) => (
                <button
                  key={suggestedModel}
                  type="button"
                  onClick={() => setModel(suggestedModel)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors",
                    suggestedModel === model
                      ? "border-accent text-accent"
                      : "border-border-subtle text-content-secondary hover:bg-surface-hover hover:text-content-primary",
                  )}
                >
                  {suggestedModel}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-content-secondary">API key</span>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={storedKeyMask ? `Saved (${storedKeyMask}) — enter to replace` : providerInfo.keyPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="rounded-lg border border-border-subtle bg-surface-app px-3 py-1.5 text-sm placeholder:text-content-tertiary focus:border-accent focus:outline-none"
            />
            {storedKeyMask && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="self-start text-xs text-danger hover:underline"
              >
                Remove saved key
              </button>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-content-secondary">Assistant mode</span>
            <SegmentedControl<AiAssistantMode>
              aria-label="Assistant mode"
              options={[
                { value: "on-demand", label: "On-demand" },
                { value: "proactive", label: "Proactive" },
              ]}
              value={mode}
              onChange={setMode}
            />
            <span className="text-xs text-content-tertiary">
              On-demand reviews when you ask. Proactive checks as you write (uses more API credit).
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleTestConnection()}
              disabled={connectionTest.status === "testing"}
              className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {connectionTest.status === "testing" ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Testing…
                </span>
              ) : (
                "Test connection"
              )}
            </button>
            {connectionTest.status === "done" && (
              <span
                role="status"
                className="flex items-center gap-1.5 text-xs text-content-secondary"
              >
                {connectionTest.result.isSuccess ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-accent" aria-hidden />
                ) : (
                  <XCircle className="size-3.5 shrink-0 text-danger" aria-hidden />
                )}
                {connectionTest.result.message}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-subtle px-3.5 py-1.5 text-sm transition-colors hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-85"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
