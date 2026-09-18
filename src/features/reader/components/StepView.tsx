"use client";

import type { PacerWord } from "../lib/pacer";
import type { BookHighlight, ReadingChunk } from "../types";

import { ChunkBlocks } from "./ChunkBlocks";

interface StepViewProps {
  chunk: ReadingChunk;
  previous: ReadingChunk | null;
  highlights: BookHighlight[];
  activeWord: PacerWord | null;
}

/** The tail of the previous chunk, so the thread is never quite cut. */
const TAIL_CHARS = 90;

/**
 * One chunk, alone, in the middle of the screen.
 *
 * Maximum focus: there is nothing else on the page to slide off to. The single
 * faint line above is the concession — without it, a chunk that opens with
 * "He didn't." is unreadable, and glancing back one line is not a distraction,
 * it is reading.
 */
export function StepView({ chunk, previous, highlights, activeWord }: StepViewProps) {
  const tail = previous ? previousTail(previous) : null;

  return (
    <div key={chunk.index} className="reader-step">
      {tail && (
        <p className="reader-tail" aria-hidden>
          …{tail}
        </p>
      )}
      <div className="reader-measure">
        <ChunkBlocks
          blocks={chunk.blocks}
          chapterIndex={chunk.chapterIndex}
          highlights={highlights}
          activeWord={activeWord}
        />
      </div>
    </div>
  );
}

function previousTail(previous: ReadingChunk): string | null {
  const text = previous.blocks
    .filter((block) => block.kind === "paragraph")
    .map((block) => block.text)
    .join(" ");
  if (!text) return null;
  return text.length <= TAIL_CHARS ? text : text.slice(-TAIL_CHARS).replace(/^\S*\s/, "");
}
