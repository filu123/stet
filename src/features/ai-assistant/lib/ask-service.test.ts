import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./provider-client", () => ({ requestCompletion: vi.fn() }));

import { requestCompletion } from "./provider-client";
import { askAboutDocument } from "./ask-service";

const mockedRequestCompletion = vi.mocked(requestCompletion);
const settings = { provider: "openai" as const, model: "gpt-5.1", mode: "on-demand" as const };

describe("askAboutDocument", () => {
  beforeEach(() => {
    mockedRequestCompletion.mockReset();
    mockedRequestCompletion.mockResolvedValue("  A grounded answer.  ");
  });

  it("grounds a question in the document", async () => {
    await expect(askAboutDocument("The idea is habit formation.", "What is the idea?", settings, "key"))
      .resolves.toBe("A grounded answer.");

    expect(mockedRequestCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining(
          "<document>\nThe idea is habit formation.\n</document>\n\nQuestion: What is the idea?",
        ),
      }),
    );
  });

  it("includes conversation history and a selected passage", async () => {
    await askAboutDocument(
      "A longer document.",
      "Can you give me an example?",
      settings,
      "key",
      [
        { role: "user", content: "What is the main point?" },
        { role: "assistant", content: "The main point is practice." },
      ],
      "Small actions compound over time.",
    );

    const [{ userPrompt }] = mockedRequestCompletion.mock.calls[0];
    expect(userPrompt).toContain("<selected-passage>\nSmall actions compound over time.");
    expect(userPrompt).toContain("user: What is the main point?");
    expect(userPrompt).toContain("assistant: The main point is practice.");
    expect(userPrompt).toContain("Question: Can you give me an example?");
  });
});
