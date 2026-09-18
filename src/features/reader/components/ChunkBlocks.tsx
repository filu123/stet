"use client";

import { buildBlockRuns } from "../lib/highlight-runs";
import type { PacerWord } from "../lib/pacer";
import { BLOCK_ATTRIBUTES } from "../lib/selection-anchor";
import type { BookHighlight, ChunkBlock, TextRun } from "../types";

interface ChunkBlocksProps {
  blocks: ChunkBlock[];
  chapterIndex: number;
  highlights: BookHighlight[];
  /** Set only on the chunk the pacer is walking. */
  activeWord?: PacerWord | null;
}

/** The text itself. Shared by every mode so they can never drift apart. */
export function ChunkBlocks({ blocks, chapterIndex, highlights, activeWord }: ChunkBlocksProps) {
  // A block index only means something within its own chapter, and a page can
  // hold the end of one chapter and the start of the next.
  const ownHighlights = highlights.filter(
    (highlight) => highlight.chapterIndex === chapterIndex,
  );

  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "sceneBreak") {
          return (
            <div key={index} className="reader-scene-break" aria-hidden>
              {block.text}
            </div>
          );
        }
        if (block.kind === "heading") {
          return (
            <h2 key={index} className="reader-heading">
              {block.text}
            </h2>
          );
        }

        // The data attributes are how a DOM selection finds its way back to a
        // place in the book that survives re-rendering at another font size.
        const attributes = {
          [BLOCK_ATTRIBUTES.chapter]: chapterIndex,
          [BLOCK_ATTRIBUTES.block]: block.blockIndex,
          [BLOCK_ATTRIBUTES.offset]: block.blockOffset,
        };
        // The pacer's offsets are local to the rendered block; highlights are
        // in source coordinates, so the word is shifted to match them.
        const pacerWord =
          activeWord && activeWord.blockIndex === index
            ? {
                start: activeWord.start + block.blockOffset,
                end: activeWord.end + block.blockOffset,
              }
            : null;
        const runs = buildBlockRuns(block, ownHighlights, pacerWord);

        return block.kind === "quote" ? (
          <blockquote key={index} className="reader-paragraph reader-quote" {...attributes}>
            <Runs runs={runs} />
          </blockquote>
        ) : (
          <p key={index} className="reader-paragraph" {...attributes}>
            <Runs runs={runs} />
          </p>
        );
      })}
    </>
  );
}

/**
 * Emphasis and highlights, built from parsed runs rather than injected HTML:
 * a book is somebody else's file, and nothing in it should reach the page as
 * markup.
 */
function Runs({ runs }: { runs: TextRun[] }) {
  return (
    <>
      {runs.map((run, index) => (
        <Run key={index} run={run} />
      ))}
    </>
  );
}

function Run({ run }: { run: TextRun }) {
  const inner = run.strong ? (
    <strong className="reader-strong">{run.text}</strong>
  ) : run.emphasis ? (
    <em>{run.text}</em>
  ) : (
    run.text
  );

  const text = run.highlight ? (
    <mark
      className="reader-highlight"
      data-highlight-id={run.highlightId}
      style={{ backgroundColor: run.highlight }}
    >
      {inner}
    </mark>
  ) : (
    inner
  );

  if (!run.isPaced) return <>{text}</>;
  return <span className="reader-paced-word">{text}</span>;
}
