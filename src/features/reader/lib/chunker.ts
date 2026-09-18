import type { BookBlock, BookChapter, ChunkBlock, ReadingChunk, TextRun } from "../types";

import { countWords, splitIntoSentences } from "./text";

/**
 * Cuts a book into the units the reader advances through.
 *
 * Word count is the unit, not paragraphs: in a novel a paragraph can be four
 * words of dialogue or two hundred words of description, and a reader who taps
 * once per line of "Yes." is doing data entry, not reading. Grouping to a word
 * target gives a short exchange on one screen and splits a long descriptive
 * paragraph at a sentence seam.
 */

export interface ChunkSize {
  target: number;
  max: number;
  min: number;
}

/** Named sizes, offered in the reader's settings. */
export const CHUNK_SIZES = {
  short: { target: 35, max: 55, min: 18 },
  medium: { target: 55, max: 85, min: 25 },
  long: { target: 95, max: 140, min: 40 },
} as const satisfies Record<string, ChunkSize>;

export type ChunkSizeName = keyof typeof CHUNK_SIZES;

/**
 * How far the reader may go without being offered somewhere to stop. Roughly
 * four minutes at an average pace — long enough to be worth finishing, short
 * enough to say yes to.
 */
const REST_SPACING_WORDS = 850;

export function buildChunks(
  chapters: BookChapter[],
  size: ChunkSize = CHUNK_SIZES.medium,
): ReadingChunk[] {
  const chunks: ReadingChunk[] = [];
  let wordsBefore = 0;

  chapters.forEach((chapter, chapterIndex) => {
    const firstOfChapter = chunks.length;
    let pending: ChunkBlock[] = [];
    let pendingWords = 0;

    const flush = (options?: { endsScene?: boolean; continuesParagraph?: boolean }) => {
      if (pending.length === 0) return;
      chunks.push({
        index: chunks.length,
        chapterIndex,
        blocks: pending,
        wordCount: pendingWords,
        wordsBefore,
        startsChapter: chunks.length === firstOfChapter,
        endsChapter: false,
        endsScene: options?.endsScene ?? false,
        isRestPoint: false,
        continuesParagraph: options?.continuesParagraph ?? false,
      });
      wordsBefore += pendingWords;
      pending = [];
      pendingWords = 0;
    };

    chapter.blocks.forEach((block, blockIndex) => {
      const at = (offset = 0): ChunkBlock => ({ ...block, blockIndex, blockOffset: offset });

      if (block.kind === "heading") {
        flush();
        pending = [at()];
        pendingWords = countWords(block.text);
        flush();
        return;
      }

      // The divider rides along at the end of the scene it closes, so the
      // reader sees the stars and gets the beat before the next scene opens.
      if (block.kind === "sceneBreak") {
        pending.push(at());
        flush({ endsScene: true });
        return;
      }

      const words = countWords(block.text);
      if (words > size.max) {
        flush();
        const pieces = splitLongBlock(block, size);
        pieces.forEach((piece, pieceIndex) => {
          pending = [{ ...piece.block, blockIndex, blockOffset: piece.offset }];
          pendingWords = countWords(piece.block.text);
          flush({ continuesParagraph: pieceIndex < pieces.length - 1 });
        });
        return;
      }

      if (pendingWords + words > size.max && pendingWords >= size.min) flush();
      pending.push(at());
      pendingWords += words;
      if (pendingWords >= size.target) flush();
    });

    flush();
    const last = chunks[chunks.length - 1];
    if (last && last.chapterIndex === chapterIndex) last.endsChapter = true;
  });

  markRestPoints(chunks);
  return chunks;
}

/**
 * Offers a stopping place in the long stretches.
 *
 * A real novel can run six thousand words without a scene break — half an hour
 * with no finish line in sight, which is exactly the stretch a distractible
 * reader gives up in. Never mid-paragraph: being told to stop halfway through
 * a sentence is worse than not being told at all.
 */
function markRestPoints(chunks: ReadingChunk[]): void {
  let sinceRest = 0;
  for (const chunk of chunks) {
    sinceRest += chunk.wordCount;
    if (chunk.endsScene || chunk.endsChapter) {
      sinceRest = 0;
      continue;
    }
    if (sinceRest >= REST_SPACING_WORDS && !chunk.continuesParagraph) {
      chunk.isRestPoint = true;
      sinceRest = 0;
    }
  }
}

/**
 * A paragraph too long for one screen, broken at sentence boundaries. Each
 * piece remembers its offset into the original, so a highlight laid over the
 * whole paragraph still lands on the right words.
 */
function splitLongBlock(
  block: BookBlock,
  size: ChunkSize,
): { block: BookBlock; offset: number }[] {
  const sentences = splitIntoSentences(block.text);
  if (sentences.length <= 1) return [{ block, offset: 0 }];

  const texts: string[] = [];
  let buffer: string[] = [];
  let words = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    if (words > 0 && words + sentenceWords > size.max) {
      texts.push(buffer.join(" "));
      buffer = [];
      words = 0;
    }
    buffer.push(sentence);
    words += sentenceWords;
  }
  if (buffer.length > 0) texts.push(buffer.join(" "));

  // A quote stays a quote when it is cut in two, and the italics inside it
  // survive the cut — dropping them would silently change how a line reads.
  let cursor = 0;
  return texts.map((text) => {
    const start = block.text.indexOf(text, cursor);
    if (start === -1) return { block: { kind: block.kind, text }, offset: cursor };
    cursor = start + text.length;
    const piece: BookBlock = block.runs
      ? { kind: block.kind, text, runs: sliceRuns(block.runs, start, cursor) }
      : { kind: block.kind, text };
    return { block: piece, offset: start };
  });
}

/** The runs covering `[start, end)` of the block's plain text. */
function sliceRuns(runs: TextRun[], start: number, end: number): TextRun[] {
  const sliced: TextRun[] = [];
  let offset = 0;

  for (const run of runs) {
    const runStart = offset;
    const runEnd = offset + run.text.length;
    offset = runEnd;
    if (runEnd <= start || runStart >= end) continue;
    const text = run.text.slice(Math.max(0, start - runStart), Math.min(run.text.length, end - runStart));
    if (text) sliced.push({ ...run, text });
  }

  return sliced;
}
