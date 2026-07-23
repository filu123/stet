import { describe, expect, it } from "vitest";

import { extractJsonArray, parseReviewResponse } from "./suggestion-parser";

describe("extractJsonArray", () => {
  it("returns the outermost array span, ignoring fences and prose", () => {
    const output = 'Sure! Here you go:\n```json\n[{"a":1}]\n```\nHope that helps.';
    expect(extractJsonArray(output)).toBe('[{"a":1}]');
  });

  it("returns null when there is no array", () => {
    expect(extractJsonArray("no brackets here")).toBeNull();
    expect(extractJsonArray("]backwards[")).toBeNull();
  });
});

describe("parseReviewResponse", () => {
  it("keeps valid suggestions and drops invalid ones", () => {
    const output = JSON.stringify([
      { kind: "grammar", quote: "teh", replacement: "the", note: "typo" },
      { kind: "style", quote: "very good", replacement: "excellent" },
      { kind: "highlight", quote: "a fine phrase", note: "nice" },
      { kind: "circle", quote: "word" },
      { kind: "invalid-kind", quote: "x", replacement: "y" }, // bad kind
      { kind: "grammar", quote: "no replacement" }, // grammar needs replacement
      { kind: "highlight", quote: "   " }, // blank quote
      "not an object",
      null,
    ]);

    const result = parseReviewResponse(output);
    expect(result.map((s) => s.kind)).toEqual(["grammar", "style", "highlight", "circle"]);
  });

  it("defaults occurrence to 1 and note to empty string", () => {
    const [suggestion] = parseReviewResponse('[{"kind":"circle","quote":"x"}]');
    expect(suggestion.occurrence).toBe(1);
    expect(suggestion.note).toBe("");
  });

  it("honors a valid integer occurrence but rejects non-positive/non-integer", () => {
    const [good] = parseReviewResponse('[{"kind":"circle","quote":"x","occurrence":3}]');
    expect(good.occurrence).toBe(3);
    const [clamped] = parseReviewResponse('[{"kind":"circle","quote":"x","occurrence":2.5}]');
    expect(clamped.occurrence).toBe(1);
    const [zero] = parseReviewResponse('[{"kind":"circle","quote":"x","occurrence":0}]');
    expect(zero.occurrence).toBe(1);
  });

  it("throws a friendly error on unreadable output", () => {
    expect(() => parseReviewResponse("total nonsense")).toThrow(/could not be read/i);
    expect(() => parseReviewResponse("[not json]")).toThrow(/could not be read/i);
    expect(() => parseReviewResponse('{"kind":"grammar"}')).toThrow(/could not be read/i);
  });
});
