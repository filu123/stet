"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

import type { PacerWord } from "../lib/pacer";
import type { BookHighlight, ReadingChunk } from "../types";

import { ChunkBlocks } from "./ChunkBlocks";

interface SpotlightViewProps {
  chunks: ReadingChunk[];
  chunkIndex: number;
  highlights: BookHighlight[];
  activeWord: PacerWord | null;
}

/** Chunks either side of the current one that stay rendered. */
const WINDOW = 12;

/**
 * The page, with the light on one chunk.
 *
 * Less focus than step mode and more context: you can see the shape of the
 * page, how much is left, what you just read — and advancing moves the light
 * rather than the text, which is much calmer to sit in for an hour.
 */
export function SpotlightView({ chunks, chunkIndex, highlights, activeWord }: SpotlightViewProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);

  const from = Math.max(0, chunkIndex - WINDOW);
  const to = Math.min(chunks.length, chunkIndex + WINDOW + 1);
  const visible = chunks.slice(from, to);

  // Keep the lit chunk in the middle of the screen. `auto` on the first paint
  // (jumping into the middle of a book should not be an animation) and smooth
  // afterwards, which is the whole feel of the mode.
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    const element = activeRef.current;
    if (!element) return;
    element.scrollIntoView({
      block: "center",
      behavior: hasScrolledRef.current ? "smooth" : "auto",
    });
    hasScrolledRef.current = true;
  }, [chunkIndex]);

  return (
    <div className="reader-spotlight">
      <div className="reader-measure">
        {visible.map((chunk) => {
          const isActive = chunk.index === chunkIndex;
          return (
            <div
              key={chunk.index}
              ref={isActive ? activeRef : undefined}
              aria-current={isActive ? "true" : undefined}
              className={cn("reader-spotlight-chunk", isActive && "is-active")}
            >
              <ChunkBlocks
                blocks={chunk.blocks}
                chapterIndex={chunk.chapterIndex}
                highlights={highlights}
                activeWord={isActive ? activeWord : null}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
