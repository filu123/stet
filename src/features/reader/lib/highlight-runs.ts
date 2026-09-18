import type { BookHighlight, ChunkBlock, TextRun } from "../types";

/**
 * Painting highlights over text that may already be formatted.
 *
 * Two independent layers — the author's italics and the reader's marks — have
 * to become one flat list of runs, because a highlight can start halfway
 * through an emphasised phrase and end halfway through the next one. The
 * answer is to cut at every boundary either layer introduces.
 */

/** The reader's marker colours. Tokens, so themes recolour them. */
export const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "var(--pill-yellow-bg)" },
  { name: "Green", value: "var(--pill-green-bg)" },
  { name: "Blue", value: "var(--pill-blue-bg)" },
  { name: "Purple", value: "var(--pill-purple-bg)" },
  { name: "Red", value: "var(--pill-red-bg)" },
] as const;

export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].value;

/** The word the pacer's light is on, in the same frame as a highlight. */
export interface PacerRange {
  start: number;
  end: number;
}

/**
 * The runs to render for one block, with any overlapping highlights — and the
 * pacer's current word — merged in.
 *
 * Three layers meet here: the author's italics, the reader's marks, and the
 * light walking the words. Any of them can start halfway through another, so
 * the answer is the same one as before: cut at every boundary any layer
 * introduces.
 *
 * Offsets in a highlight are relative to the *source* block, while a rendered
 * block may be one slice of it — `blockOffset` is what reconciles the two.
 */
export function buildBlockRuns(
  block: ChunkBlock,
  highlights: BookHighlight[],
  pacerWord?: PacerRange | null,
): TextRun[] {
  const base: TextRun[] = block.runs ?? [{ text: block.text }];
  const overlapping = highlights.filter(
    (highlight) =>
      highlight.blockIndex === block.blockIndex &&
      highlight.end > block.blockOffset &&
      highlight.start < block.blockOffset + block.text.length,
  );
  if (overlapping.length === 0 && !pacerWord) return base;

  // Every point where a highlight or the pacer opens or closes.
  const cuts = new Set<number>([0, block.text.length]);
  for (const highlight of overlapping) {
    cuts.add(clamp(highlight.start - block.blockOffset, 0, block.text.length));
    cuts.add(clamp(highlight.end - block.blockOffset, 0, block.text.length));
  }
  if (pacerWord) {
    cuts.add(clamp(pacerWord.start - block.blockOffset, 0, block.text.length));
    cuts.add(clamp(pacerWord.end - block.blockOffset, 0, block.text.length));
  }

  const runs: TextRun[] = [];
  let offset = 0;
  for (const run of base) {
    const runStart = offset;
    const runEnd = offset + run.text.length;
    offset = runEnd;

    const boundaries = [...cuts]
      .filter((cut) => cut > runStart && cut < runEnd)
      .sort((a, b) => a - b);

    let pieceStart = runStart;
    for (const boundary of [...boundaries, runEnd]) {
      const text = run.text.slice(pieceStart - runStart, boundary - runStart);
      if (text) runs.push(withLayers(run, text, pieceStart, block, overlapping, pacerWord));
      pieceStart = boundary;
    }
  }

  return runs;
}

function withLayers(
  run: TextRun,
  text: string,
  start: number,
  block: ChunkBlock,
  highlights: BookHighlight[],
  pacerWord: PacerRange | null | undefined,
): TextRun {
  const absolute = start + block.blockOffset;
  // The most recent highlight wins where two overlap — the reader's latest
  // action is the one they expect to see.
  const covering = highlights
    .filter((highlight) => highlight.start <= absolute && highlight.end > absolute)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const isPaced = Boolean(
    pacerWord && pacerWord.start <= absolute && pacerWord.end > absolute,
  );

  const layered: TextRun = { ...run, text };
  if (covering) {
    layered.highlight = covering.color;
    layered.highlightId = covering.id;
  }
  if (isPaced) layered.isPaced = true;
  return layered;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * Trims a new highlight to something worth keeping: no empty selections, no
 * accidental single characters from a mistimed long-press.
 */
export function isWorthHighlighting(text: string): boolean {
  return text.trim().length >= 2;
}
