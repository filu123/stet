import { describe, expect, it } from "vitest";

import { buildChunks } from "./chunker";
import { buildPacerWords, wordDurations } from "./pacer";
import type { BookBlock } from "../types";

const paragraph = (text: string): BookBlock => ({ kind: "paragraph", text });

const chunkOf = (blocks: BookBlock[]) => [buildChunks([{ title: null, blocks }])[0]];

describe("buildPacerWords", () => {
  it("walks the words of a paragraph in order", () => {
    const words = buildPacerWords(chunkOf([paragraph("The night was dark.")]));
    expect(words.map((word) => word.text)).toEqual(["The", "night", "was", "dark."]);
  });

  it("gives offsets that point back at the block's own text", () => {
    const text = "The night was dark.";
    const words = buildPacerWords(chunkOf([paragraph(text)]));
    for (const word of words) {
      expect(text.slice(word.start, word.end)).toBe(word.text);
    }
  });

  it("crosses paragraphs inside one chunk, keeping each block's index", () => {
    const words = buildPacerWords(chunkOf([paragraph("First line."), paragraph("Second line.")]));
    expect(words.map((word) => word.blockIndex)).toEqual([0, 0, 1, 1]);
  });

  it("skips furniture: headings and scene dividers are not read", () => {
    const chunk = chunkOf([paragraph("Real words here."), { kind: "sceneBreak", text: "* * *" }]);
    const words = buildPacerWords(chunk);
    expect(words.every((word) => word.blockIndex === 0)).toBe(true);
    expect(words.map((word) => word.text)).not.toContain("*");
  });
});

describe("wordDurations", () => {
  const words = buildPacerWords(
    chunkOf([paragraph("A rather extraordinary sentence, and then it stopped.")]),
  );

  it("spends exactly the time the chosen pace promises", () => {
    const durations = wordDurations(words, 300);
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    // 9 words at 300 wpm is 1.8 seconds, whatever the rhythm within it.
    expect(total).toBeCloseTo((words.length / 300) * 60_000, 5);
  });

  it("rests longer on a long word than a short one", () => {
    const durations = wordDurations(words, 300);
    const extraordinary = durations[words.findIndex((word) => word.text === "extraordinary")];
    const a = durations[words.findIndex((word) => word.text === "A")];
    expect(extraordinary).toBeGreaterThan(a);
  });

  it("rests longest at a full stop", () => {
    const durations = wordDurations(words, 300);
    const last = durations[words.length - 1];
    expect(words.at(-1)?.text).toBe("stopped.");
    expect(last).toBeGreaterThan(Math.max(...durations.slice(0, -1)));
  });

  it("pauses at a comma, but less than at a full stop", () => {
    const commaIndex = words.findIndex((word) => word.text === "sentence,");
    const durations = wordDurations(words, 300);
    expect(durations[commaIndex]).toBeGreaterThan(durations[words.findIndex((w) => w.text === "and")]);
    expect(durations[commaIndex]).toBeLessThan(durations[words.length - 1]);
  });

  it("halves the time when the pace doubles", () => {
    const slow = wordDurations(words, 200).reduce((sum, value) => sum + value, 0);
    const fast = wordDurations(words, 400).reduce((sum, value) => sum + value, 0);
    expect(fast).toBeCloseTo(slow / 2, 5);
  });

  it("has nothing to schedule for an empty passage", () => {
    expect(wordDurations([], 300)).toEqual([]);
  });
});
