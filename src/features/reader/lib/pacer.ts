import type { ReadingChunk } from "../types";

/**
 * The reading pacer: a light that walks the words at a pace you set.
 *
 * A guide rather than a metronome. Giving every word an identical slot reads
 * like a machine — a long word needs longer, and a full stop is where a reader
 * breathes. So each word gets a weight, and the weights are then normalised
 * across the passage so the *average* still lands exactly on the words per
 * minute you asked for. The rhythm varies; the promise does not.
 */

export interface PacerWord {
  /** Which chunk on screen the word belongs to — a page can hold several. */
  chunkIndex: number;
  /** Index of the block within that chunk. */
  blockIndex: number;
  /** Character offsets inside that block's own text. */
  start: number;
  end: number;
  text: string;
}

/**
 * Every word the pacer will visit, in reading order.
 *
 * Takes whatever is on screen rather than a single chunk: in page mode that is
 * a screenful of them, and the light has to cross the whole page before it
 * stops and waits.
 */
export function buildPacerWords(chunks: ReadingChunk[]): PacerWord[] {
  const words: PacerWord[] = [];

  for (const chunk of chunks) {
    chunk.blocks.forEach((block, blockIndex) => {
      // Headings and scene dividers are furniture, not reading.
      if (block.kind !== "paragraph" && block.kind !== "quote") return;
      const pattern = /\S+/g;
      for (let match = pattern.exec(block.text); match; match = pattern.exec(block.text)) {
        words.push({
          chunkIndex: chunk.index,
          blockIndex,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
      }
    });
  }

  return words;
}

/**
 * How long to rest on each word, in milliseconds.
 *
 * The total is exactly `words / wordsPerMinute` minutes — the weights only
 * decide how that budget is shared out.
 */
export function wordDurations(words: PacerWord[], wordsPerMinute: number): number[] {
  if (words.length === 0 || wordsPerMinute <= 0) return [];

  const weights = words.map((word) => weightOf(word.text));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const budget = (words.length / wordsPerMinute) * 60_000;

  return weights.map((weight) => (weight / total) * budget);
}

/** Longer words take longer to take in; punctuation is where a reader breathes. */
function weightOf(text: string): number {
  let weight = 1;
  if (text.length > 8) weight += 0.35;
  if (text.length > 14) weight += 0.35;
  if (/[,;:—–]["'”’)]?$/.test(text)) weight += 0.5;
  if (/[.!?…]["'”’)]?$/.test(text)) weight += 1;
  return weight;
}
