"use client";

import { ArrowRight } from "lucide-react";

import type { ReadingChunk } from "../types";

interface ResumeCardProps {
  bookTitle: string;
  chapterTitle: string | null;
  progressPercent: number;
  previous: ReadingChunk | null;
  onResume: () => void;
}

/**
 * Where was I.
 *
 * The hardest moment in reading a long book is not a hard sentence, it is
 * opening it again on Thursday having last read it on Sunday. This costs one
 * tap and removes the "I'd have to find my place" that ends most books.
 */
export function ResumeCard({
  bookTitle,
  chapterTitle,
  progressPercent,
  previous,
  onResume,
}: ResumeCardProps) {
  const lastWords = previous?.blocks
    .filter((block) => block.kind === "paragraph")
    .map((block) => block.text)
    .join(" ");

  return (
    <div className="reader-resume">
      <div className="reader-measure">
        <p className="text-xs tracking-wide text-content-tertiary uppercase">Where you were</p>
        <h1 className="mt-2 text-xl font-semibold text-content-primary">{bookTitle}</h1>
        <p className="mt-1 text-sm text-content-secondary">
          {chapterTitle ?? "The beginning"} · {Math.round(progressPercent * 100)}% in
        </p>

        {lastWords && <p className="reader-resume-quote">…{lastWords}</p>}

        <button type="button" onClick={onResume} className="reader-resume-button">
          Continue reading
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
