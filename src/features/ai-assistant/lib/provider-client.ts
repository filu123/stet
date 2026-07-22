import type { AiSettings } from "@/types/ai";

/**
 * Provider-agnostic completion call: prompts in, raw model text out.
 * Raw fetch on purpose — this module is deliberately neutral across three
 * providers. Error messages must never contain the API key.
 */
export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  settings: AiSettings;
  apiKey: string;
}

export async function requestCompletion({
  systemPrompt,
  userPrompt,
  settings,
  apiKey,
}: CompletionRequest): Promise<string> {
  let response: Response;
  try {
    switch (settings.provider) {
      case "anthropic":
        response = await callAnthropic(settings.model, apiKey, systemPrompt, userPrompt);
        break;
      case "openai":
        response = await callOpenAi(settings.model, apiKey, systemPrompt, userPrompt);
        break;
      case "gemini":
        response = await callGemini(settings.model, apiKey, systemPrompt, userPrompt);
        break;
    }
  } catch {
    throw new Error("Couldn't reach the AI provider — check your internet connection.");
  }

  if (!response.ok) throw errorFromStatus(response.status);
  return extractCompletionText(settings.provider, await response.json());
}

function callAnthropic(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
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
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
}

function callOpenAi(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
}

function callGemini(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      }),
    },
  );
}

function extractCompletionText(provider: AiSettings["provider"], body: unknown): string {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any -- three unrelated
       provider response shapes; a wrong path lands in the catch below. */
    const raw = body as any;
    switch (provider) {
      case "anthropic":
        return raw.content
          .filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("");
      case "openai":
        return raw.choices[0].message.content;
      case "gemini":
        return raw.candidates[0].content.parts
          .map((part: any) => part.text ?? "")
          .join("");
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch {
    throw new Error("The AI provider returned an unexpected response format.");
  }
}

function errorFromStatus(status: number): Error {
  if (status === 401 || status === 403) {
    return new Error("Invalid API key — check it in AI settings.");
  }
  if (status === 404) {
    return new Error("Model not found — check the model name in AI settings.");
  }
  if (status === 429) {
    return new Error("Rate limited by the provider — wait a moment and try again.");
  }
  if (status >= 500) {
    return new Error("The AI provider is having trouble right now — try again shortly.");
  }
  return new Error(`The AI provider returned an error (HTTP ${status}).`);
}
