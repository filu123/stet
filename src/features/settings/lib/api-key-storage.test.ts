import { afterEach, describe, expect, it } from "vitest";

import { clearApiKey, maskApiKey, readApiKey, writeApiKey } from "./api-key-storage";

afterEach(() => window.localStorage.clear());

describe("api key storage", () => {
  it("round-trips a key per provider", () => {
    writeApiKey("anthropic", "sk-ant-123");
    writeApiKey("openai", "sk-oai-456");
    expect(readApiKey("anthropic")).toBe("sk-ant-123");
    expect(readApiKey("openai")).toBe("sk-oai-456");
  });

  it("returns null when unset", () => {
    expect(readApiKey("gemini")).toBeNull();
  });

  it("clears only the targeted provider", () => {
    writeApiKey("anthropic", "keep");
    writeApiKey("openai", "remove");
    clearApiKey("openai");
    expect(readApiKey("anthropic")).toBe("keep");
    expect(readApiKey("openai")).toBeNull();
  });

  it("stores under a namespaced key, never a bare name", () => {
    writeApiKey("anthropic", "secret");
    expect(window.localStorage.getItem("editor-api-key:anthropic")).toBe("secret");
  });

  it("masks a key without revealing more than the last 4 chars", () => {
    const masked = maskApiKey("sk-ant-supersecret-tail");
    expect(masked).toBe("••••…tail");
    expect(masked).not.toContain("supersecret");
  });
});
