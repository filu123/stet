import { describe, expect, it } from "vitest";

import {
  documentContentToMarkdown,
  documentContentToPlainText,
  markdownToDocumentContent,
} from "./markdown-serializer";

/** Markdown → JSON → Markdown should preserve structural formatting. */
function roundTrip(markdown: string): string {
  return documentContentToMarkdown(markdownToDocumentContent(markdown)).trim();
}

describe("markdown round-trip", () => {
  it("preserves headings", () => {
    expect(roundTrip("# Title")).toBe("# Title");
    expect(roundTrip("### Small heading")).toBe("### Small heading");
  });

  it("preserves inline emphasis", () => {
    expect(roundTrip("A **bold** and *italic* line.")).toBe("A **bold** and *italic* line.");
  });

  it("preserves blockquotes", () => {
    expect(roundTrip("> a quotation")).toBe("> a quotation");
  });

  it("preserves bullet and ordered lists", () => {
    expect(roundTrip("* one\n* two")).toBe("* one\n\n* two");
    expect(roundTrip("1. first\n2. second")).toContain("1. first");
  });

  it("preserves fenced code blocks", () => {
    const markdown = "```\nconst x = 1;\n```";
    expect(roundTrip(markdown)).toContain("const x = 1;");
    expect(roundTrip(markdown)).toContain("```");
  });

  it("preserves links", () => {
    expect(roundTrip("See [the docs](https://example.com).")).toBe(
      "See [the docs](https://example.com).",
    );
  });
});

describe("documentContentToPlainText", () => {
  it("returns block text with markup stripped", () => {
    const content = markdownToDocumentContent("# Chapter\n\nThe **brave** fox.");
    const text = documentContentToPlainText(content);
    expect(text).toContain("Chapter");
    expect(text).toContain("The brave fox.");
    expect(text).not.toContain("**");
    expect(text).not.toContain("#");
  });

  it("returns empty string for null content", () => {
    expect(documentContentToPlainText(null)).toBe("");
  });
});

describe("empty input", () => {
  it("serializes null content to an empty string", () => {
    expect(documentContentToMarkdown(null)).toBe("");
  });
});
