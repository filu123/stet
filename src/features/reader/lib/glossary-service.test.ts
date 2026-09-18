import { describe, expect, it } from "vitest";

import { parseGlossaryAnswer } from "./glossary-service";
import type { CharacterEntry } from "../types";

const character = (name: string): CharacterEntry => ({
  name,
  mentions: 4,
  firstChunkIndex: 0,
  firstChapterIndex: 0,
  firstSentence: "",
  evidence: [],
});

const characters = [character("Jonathan"), character("Van Helsing"), character("Whitby")];

describe("parseGlossaryAnswer", () => {
  it("reads one description per line", () => {
    const parsed = parseGlossaryAnswer(
      "Jonathan :: A young solicitor travelling east\nVan Helsing :: A doctor called in by Seward",
      characters,
    );
    expect(parsed).toEqual([
      { name: "Jonathan", description: "A young solicitor travelling east" },
      { name: "Van Helsing", description: "A doctor called in by Seward" },
    ]);
  });

  it("keeps the index's spelling of the name", () => {
    const parsed = parseGlossaryAnswer("van helsing :: A doctor", characters);
    expect(parsed[0].name).toBe("Van Helsing");
  });

  it("drops a name the index never asked about", () => {
    const parsed = parseGlossaryAnswer("Dracula :: The count himself", characters);
    expect(parsed).toEqual([]);
  });

  it("drops characters the model had nothing to say about", () => {
    const parsed = parseGlossaryAnswer("Jonathan :: not yet clear", characters);
    expect(parsed).toEqual([]);
  });

  it("keeps the 'not a person' verdict so the caller can hide a place", () => {
    const parsed = parseGlossaryAnswer("Whitby :: not a person", characters);
    expect(parsed).toEqual([{ name: "Whitby", description: "not a person" }]);
  });

  it("returns nothing when the model ignores the format", () => {
    const parsed = parseGlossaryAnswer(
      "Sure! Here is a summary of the characters in Dracula, a novel by Bram Stoker.",
      characters,
    );
    expect(parsed).toEqual([]);
  });

  it("tolerates list markers the model adds anyway", () => {
    const parsed = parseGlossaryAnswer("- Jonathan :: A solicitor", characters);
    expect(parsed[0]).toEqual({ name: "Jonathan", description: "A solicitor" });
  });
});
