"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

import type { PacerWord } from "../lib/pacer";
import type { BookHighlight, ReadingChunk } from "../types";

import { ChunkBlocks } from "./ChunkBlocks";

/** Chunks rendered past the fold — enough to fill any screen, then stop. */
const LOOKAHEAD = 30;

export interface PageBounds {
  /** First chunk that did not fit: where the next page begins. */
  next: number;
  /** Words on this page, which is how the previous page is estimated. */
  words: number;
}

interface PageViewProps {
  chunks: ReadingChunk[];
  chunkIndex: number;
  highlights: BookHighlight[];
  activeWord: PacerWord | null;
  onBounds: (bounds: PageBounds) => void;
}

/**
 * No focus aid: a page of the book, as much as the screen holds.
 *
 * The page is rendered forwards from where the reader is and then measured —
 * whatever crosses the fold is kept in the layout but hidden, so nothing shows
 * as a sliced half-line and the measurements stay honest. That first chunk
 * past the fold is where the next page begins.
 */
export function PageView({ chunks, chunkIndex, highlights, activeWord, onBounds }: PageViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [pageEnd, setPageEnd] = useState(chunkIndex + 1);

  const visible = chunks.slice(chunkIndex, Math.min(chunks.length, chunkIndex + LOOKAHEAD));

  // Reported through a ref so a parent that re-renders on every page turn does
  // not make this effect fire again and re-measure for nothing.
  const onBoundsRef = useRef(onBounds);
  useEffect(() => {
    onBoundsRef.current = onBounds;
  }, [onBounds]);

  const lastBoundsRef = useRef<PageBounds | null>(null);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const stack = stackRef.current;
    if (!viewport || !stack) return;

    // The fold is the viewport's inner edge, padding excluded — comparing
    // against its full height would let a chunk spill into the bottom margin
    // and still count as fitting.
    const paddingBottom = Number.parseFloat(getComputedStyle(viewport).paddingBottom) || 0;
    const fold = viewport.getBoundingClientRect().bottom - paddingBottom;
    const children = Array.from(stack.children) as HTMLElement[];

    // At least one chunk always shows, even one taller than the screen —
    // a page with nothing on it would be a dead end.
    let fitted = 1;
    for (let index = 1; index < children.length; index++) {
      if (children[index].getBoundingClientRect().bottom > fold) break;
      fitted = index + 1;
    }

    const end = Math.min(chunks.length, chunkIndex + fitted);
    setPageEnd(end);

    const bounds: PageBounds = {
      next: end,
      words: chunks.slice(chunkIndex, end).reduce((total, chunk) => total + chunk.wordCount, 0),
    };
    const last = lastBoundsRef.current;
    if (last && last.next === bounds.next && last.words === bounds.words) return;
    lastBoundsRef.current = bounds;
    onBoundsRef.current(bounds);
  }, [chunkIndex, chunks]);

  // Measured after layout rather than in the effect body: the text has to be
  // on the page before there is anything to measure.
  useEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure]);

  // The screen rotates, the font grows, the chapter changes — all of which
  // change what fits.
  useEffect(() => {
    const viewport = viewportRef.current;
    const stack = stackRef.current;
    if (!viewport || !stack) return;
    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    observer.observe(viewport);
    observer.observe(stack);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div ref={viewportRef} className="reader-page">
      <div ref={stackRef} className="reader-measure">
        {visible.map((chunk) => (
          <div
            key={chunk.index}
            aria-hidden={chunk.index >= pageEnd}
            className={cn("reader-page-chunk", chunk.index >= pageEnd && "is-overflow")}
          >
            <ChunkBlocks
              blocks={chunk.blocks}
              chapterIndex={chunk.chapterIndex}
              highlights={highlights}
              activeWord={activeWord?.chunkIndex === chunk.index ? activeWord : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
