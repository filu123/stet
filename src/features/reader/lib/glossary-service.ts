import type { AiSettings } from "@/types/ai";

import { requestCompletion } from "@/features/ai-assistant";

import type { CharacterEntry } from "../types";

/**
 * One line each on the people in a novel, written from the reader's own copy
 * of the story so far.
 *
 * Two rules make this safe to point at fiction:
 *
 * 1. The model is sent *only* the sentences the local index collected from
 *    text the reader has already passed. It cannot leak what is coming,
 *    because it is never shown what is coming.
 * 2. It is told, in the prompt and by the shape of the input, not to use what
 *    it already knows about the book. A model that has read Dracula knows how
 *    it ends; the prompt has to actively stop it being helpful about that.
 *
 * The glossary works with no API key at all — this only enriches it.
 */

const GLOSSARY_SYSTEM_PROMPT = `You are helping a reader keep track of who is who in a novel they are part-way through.

You will be given a list of names and, for each, a few sentences quoted from the part of the book the reader has ALREADY read.

Rules, in order of importance:
1. NEVER use anything you know about this book, its author, or its ending. Treat the quoted sentences as the only text that exists. If you recognise the novel, ignore that recognition entirely.
2. NEVER hint at, foreshadow, or refer to anything that happens outside the quotes. No "later revealed to be", no "turns out", no character's fate.
3. Describe each name in ONE short line (under 12 words), using only what the quotes support: their role, relationship, or what they were doing.
4. If a name is not a person (a place, a ship, a day, a building), reply exactly: not a person
5. If the quotes do not say anything useful about them, reply exactly: not yet clear

Answer with one line per name, in the form:
Name :: description

No preamble, no numbering, no markdown.`;

export interface GlossaryDescription {
  name: string;
  description: string;
}

/** Names the model rejected, which the caller should hide rather than show. */
export const NOT_A_PERSON = "not a person";
const NOT_YET_CLEAR = "not yet clear";

export async function describeCharacters(
  characters: CharacterEntry[],
  settings: AiSettings,
  apiKey: string,
): Promise<GlossaryDescription[]> {
  if (characters.length === 0) return [];

  const userPrompt = characters
    .map((character) => {
      const quotes = character.evidence.map((sentence) => `  - "${sentence}"`).join("\n");
      return `${character.name}\n${quotes}`;
    })
    .join("\n\n");

  const answer = await requestCompletion({
    systemPrompt: GLOSSARY_SYSTEM_PROMPT,
    userPrompt,
    settings,
    apiKey,
  });

  return parseGlossaryAnswer(answer, characters);
}

/**
 * Line-based on purpose: a model that ignores the format and writes prose
 * should produce no entries rather than one long fake one.
 */
export function parseGlossaryAnswer(
  answer: string,
  characters: CharacterEntry[],
): GlossaryDescription[] {
  const known = new Map(characters.map((character) => [character.name.toLowerCase(), character]));
  const descriptions: GlossaryDescription[] = [];

  for (const line of answer.split("\n")) {
    const separator = line.indexOf("::");
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim().replace(/^[-*\d.\s]+/, "");
    const description = line.slice(separator + 2).trim();
    if (!name || !description) continue;

    const match = known.get(name.toLowerCase());
    if (!match) continue;
    if (description.toLowerCase().startsWith(NOT_YET_CLEAR)) continue;

    descriptions.push({ name: match.name, description });
  }

  return descriptions;
}
