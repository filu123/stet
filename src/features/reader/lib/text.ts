/** Small text primitives shared by the parser, the chunker and the index. */

/** Titles that pull the following capitalised word into a name. */
export const NAME_TITLES = [
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "prof",
  "professor",
  "lord",
  "lady",
  "sir",
  "dame",
  "count",
  "countess",
  "captain",
  "capt",
  "colonel",
  "major",
  "father",
  "sister",
  "madame",
  "madam",
  "monsieur",
  "señor",
  "don",
  "aunt",
  "uncle",
  "king",
  "queen",
  "prince",
  "princess",
] as const;

/** Abbreviations a sentence never actually ends on. */
const ABBREVIATIONS = new RegExp(
  `\\b(?:${[...NAME_TITLES, "jr", "sr", "st", "vs", "etc", "no", "vol", "ch", "p", "pp", "e\\.g", "i\\.e"].join("|")})\\.$`,
  "i",
);

export function countWords(text: string): number {
  const matched = text.match(/\S+/g);
  return matched ? matched.length : 0;
}

/**
 * Splits prose into sentences, keeping "Mr. Harker" in one piece.
 *
 * Deliberately simple: it only has to be good enough to break an over-long
 * paragraph at a readable seam and to quote a character's first appearance.
 */
export function splitIntoSentences(text: string): string[] {
  const pieces = text.split(/(?<=[.!?…]["'”’)]?)\s+/);
  const sentences: string[] = [];
  for (const piece of pieces) {
    const previous = sentences[sentences.length - 1];
    if (previous !== undefined && ABBREVIATIONS.test(previous)) {
      sentences[sentences.length - 1] = `${previous} ${piece}`;
      continue;
    }
    if (piece.trim()) sentences.push(piece.trim());
  }
  return sentences;
}
