import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { buildEditorExtensions } from "@/features/editor/lib/editor-extensions";

import { buildDocumentTextIndex, resolveQuoteRange } from "./position-mapper";

const schema = getSchema(buildEditorExtensions());

function docFromParagraphs(...paragraphs: string[]) {
  return schema.nodeFromJSON({
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  });
}

describe("buildDocumentTextIndex", () => {
  it("joins blocks with newlines and maps every char to a PM position", () => {
    const index = buildDocumentTextIndex(docFromParagraphs("Hi", "Bye"));
    expect(index.text).toBe("Hi\nBye");
    // The separator carries -1; the 5 real chars carry ascending positions.
    expect(index.positions).toContain(-1);
    expect(index.positions.filter((p) => p !== -1).length).toBe(5);
    expect(index.positions).toHaveLength(6);
  });
});

describe("resolveQuoteRange", () => {
  it("resolves a simple quote to a PM range whose text matches", () => {
    const doc = docFromParagraphs("The quick brown fox");
    const index = buildDocumentTextIndex(doc);
    const range = resolveQuoteRange(index, "quick", 1)!;
    expect(range).not.toBeNull();
    expect(doc.textBetween(range.from, range.to)).toBe("quick");
  });

  it("locates the nth occurrence", () => {
    const doc = docFromParagraphs("na na na batman");
    const index = buildDocumentTextIndex(doc);
    const first = resolveQuoteRange(index, "na", 1)!;
    const third = resolveQuoteRange(index, "na", 3)!;
    expect(third.from).toBeGreaterThan(first.from);
    expect(doc.textBetween(third.from, third.to)).toBe("na");
  });

  it("clamps an out-of-range occurrence to the last match", () => {
    const doc = docFromParagraphs("na na batman");
    const index = buildDocumentTextIndex(doc);
    const clamped = resolveQuoteRange(index, "na", 99)!;
    const second = resolveQuoteRange(index, "na", 2)!;
    expect(clamped).toEqual(second);
  });

  it("returns null when the quote is absent", () => {
    const index = buildDocumentTextIndex(docFromParagraphs("hello world"));
    expect(resolveQuoteRange(index, "goodbye", 1)).toBeNull();
  });

  it("rejects a quote that crosses a block boundary", () => {
    const index = buildDocumentTextIndex(docFromParagraphs("first", "second"));
    // "first\nsecond" exists in the text, but spans a paragraph break.
    expect(resolveQuoteRange(index, "first\nsecond", 1)).toBeNull();
  });

  it("stays aligned across multibyte characters (emoji)", () => {
    const doc = docFromParagraphs("keep 🎉 going strong");
    const index = buildDocumentTextIndex(doc);
    const range = resolveQuoteRange(index, "going", 1)!;
    expect(doc.textBetween(range.from, range.to)).toBe("going");
  });

  it("returns null for an empty quote", () => {
    const index = buildDocumentTextIndex(docFromParagraphs("anything"));
    expect(resolveQuoteRange(index, "", 1)).toBeNull();
  });
});
