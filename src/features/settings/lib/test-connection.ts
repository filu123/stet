import type { AiProvider } from "../types";

/**
 * Minimal, cheapest-possible API calls to verify a key works, straight from
 * the browser (all three providers allow CORS for these endpoints).
 *
 * Raw fetch on purpose: this module is deliberately provider-neutral across
 * three APIs; result messages must never contain the key or raw response bodies.
 */

export interface ConnectionTestResult {
  isSuccess: boolean;
  message: string;
}

export async function testProviderConnection(
  provider: AiProvider,
  apiKey: string,
  model: string,
): Promise<ConnectionTestResult> {
  try {
    switch (provider) {
      case "anthropic":
        return await testAnthropicConnection(apiKey, model);
      case "openai":
        return await testOpenAiConnection(apiKey);
      case "gemini":
        return await testGeminiConnection(apiKey);
    }
  } catch {
    return {
      isSuccess: false,
      message: "Couldn't reach the API — check your internet connection.",
    };
  }
}

async function testAnthropicConnection(
  apiKey: string,
  model: string,
): Promise<ConnectionTestResult> {
  // 1-token message: validates both the key AND the chosen model.
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for browser-side requests; safe here — the key is the user's own.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "Hi" }],
    }),
  });

  if (response.ok) return { isSuccess: true, message: `Connected — ${model} responded.` };
  if (response.status === 404) {
    return { isSuccess: false, message: `Key works, but the model "${model}" was not found.` };
  }
  return failureFromStatus(response.status);
}

async function testOpenAiConnection(apiKey: string): Promise<ConnectionTestResult> {
  // Model listing is free and validates the key.
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { authorization: `Bearer ${apiKey}` },
  });

  if (response.ok) return { isSuccess: true, message: "Connected — key is valid." };
  return failureFromStatus(response.status);
}

async function testGeminiConnection(apiKey: string): Promise<ConnectionTestResult> {
  // Model listing is free and validates the key. Gemini reports bad keys as 400.
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": apiKey },
  });

  if (response.ok) return { isSuccess: true, message: "Connected — key is valid." };
  if (response.status === 400) {
    return { isSuccess: false, message: "Invalid API key — double-check and try again." };
  }
  return failureFromStatus(response.status);
}

function failureFromStatus(status: number): ConnectionTestResult {
  if (status === 401 || status === 403) {
    return { isSuccess: false, message: "Invalid API key — double-check and try again." };
  }
  if (status === 429) {
    return { isSuccess: false, message: "Key works, but you're being rate limited right now." };
  }
  return { isSuccess: false, message: `The provider returned an error (HTTP ${status}).` };
}
