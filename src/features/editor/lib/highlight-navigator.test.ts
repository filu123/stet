import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { buildEditorExtensions } from "./editor-extensions";
import { findLastHighlightRange } from "./highlight-navigator";

const schema = getSchema(buildEditorExtensions());
const YELLOW = "var(--pill-yellow-bg)";

type Span = { text: string; highlight?: string; bold?: boolean };

/** Builds a doc from paragraphs of spans, marking the requested ones. */
function docOf(...paragraphs: Span[][]) {
  return schema.nodeFromJSON({
    type: "doc",
    content: paragraphs.map((spans) => ({
      type: "paragraph",
      content: spans.map((span) => ({
        type: "text",
        text: span.text,
        marks: [
          ...(span.highlight ? [{ type: "highlight", attrs: { color: span.highlight } }] : []),
          ...(span.bold ? [{ type: "bold" }] : []),
        ],
      })),
    })),
  });
}

function textOf(doc: ReturnType<typeof docOf>, range: { from: number; to: number }) {
  return doc.textBetween(range.from, range.to);
}

describe("findLastHighlightRange", () => {
  it("returns null when nothing is highlighted", () => {
    expect(findLastHighlightRange(docOf([{ text: "plain text" }]))).toBeNull();
  });

  it("finds the last highlight in document order, not the first", () => {
    const doc = docOf(
      [{ text: "first " }, { text: "early", highlight: YELLOW }],
      [{ text: "second " }, { text: "later", highlight: YELLOW }],
    );
    const range = findLastHighlightRange(doc)!;
    expect(textOf(doc, range)).toBe("later");
  });

  it("merges adjacent highlighted spans split by another mark", () => {
    // "one two three" highlighted throughout, but "two " is also bold —
    // ProseMirror stores that as three text nodes.
    const doc = docOf([
      { text: "one ", highlight: YELLOW },
      { text: "two ", highlight: YELLOW, bold: true },
      { text: "three", highlight: YELLOW },
    ]);
    const range = findLastHighlightRange(doc)!;
    expect(textOf(doc, range)).toBe("one two three");
  });

  it("does not merge highlights separated by unhighlighted text", () => {
    const doc = docOf([
      { text: "aaa", highlight: YELLOW },
      { text: " gap " },
      { text: "bbb", highlight: YELLOW },
    ]);
    const range = findLastHighlightRange(doc)!;
    expect(textOf(doc, range)).toBe("bbb");
  });

  it("caches per document node", () => {
    const doc = docOf([{ text: "x", highlight: YELLOW }]);
    expect(findLastHighlightRange(doc)).toBe(findLastHighlightRange(doc));
  });
});
