import { describe, expect, it } from "vitest";

import type { TipTapJsonContent } from "@/types/document";

import { extractSnippet } from "./extract-snippet";

function doc(...paragraphs: string[]): TipTapJsonContent {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

describe("extractSnippet", () => {
  it("returns empty string for null or empty content", () => {
    expect(extractSnippet(null)).toBe("");
    expect(extractSnippet(doc())).toBe("");
  });

  it("joins block text", () => {
    expect(extractSnippet(doc("Hello world", "Second block"))).toBe("Hello world  Second block");
  });

  it("skips blank blocks", () => {
    expect(extractSnippet(doc("", "Real text", ""))).toBe("Real text");
  });

  it("truncates with an ellipsis past the limit", () => {
    const long = "word ".repeat(100).trim();
    const snippet = extractSnippet(doc(long), 40);
    expect(snippet.length).toBeLessThanOrEqual(41);
    expect(snippet.endsWith("…")).toBe(true);
  });

  it("gathers nested inline text (e.g. marks)", () => {
    const content: TipTapJsonContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "The " },
            { type: "text", text: "brave", marks: [{ type: "bold" }] },
            { type: "text", text: " fox" },
          ],
        },
      ],
    };
    expect(extractSnippet(content)).toBe("The brave fox");
  });
});
