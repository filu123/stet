"use client";

import { useEffect, useState } from "react";

import { useEditorState, type Editor } from "@tiptap/react";

interface WordCountPillProps {
  editor: Editor;
}

interface PageInfo {
  current: number;
  total: number;
}

/**
 * Floating "N words · M characters · Page X of Y" readout — hovers at the
 * bottom while scrolling. The page part appears only in Pages layout
 * (derived from the rendered page-gap bands).
 */
export function WordCountPill({ editor }: WordCountPillProps) {
  const { words, characters } = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => {
      const doc = editorInstance.state.doc;
      const text = doc.textBetween(0, doc.content.size, " ");
      return {
        words: text.trim().split(/\s+/).filter(Boolean).length,
        characters: doc.textContent.length,
      };
    },
  });

  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  useEffect(() => {
    const updatePageInfo = () => {
      const bands = document.querySelectorAll(".page-gap-band");
      if (bands.length === 0) {
        setPageInfo(null);
        return;
      }
      const viewportMiddle = window.innerHeight / 2;
      let current = 1;
      bands.forEach((band) => {
        if (band.getBoundingClientRect().top < viewportMiddle) current++;
      });
      const total = bands.length + 1;
      setPageInfo((previous) =>
        previous?.current === current && previous.total === total
          ? previous
          : { current, total },
      );
    };

    updatePageInfo();
    // Scroll for responsiveness; slow interval covers layout/pagination changes.
    window.addEventListener("scroll", updatePageInfo, true);
    const refreshTimer = window.setInterval(updatePageInfo, 500);
    return () => {
      window.removeEventListener("scroll", updatePageInfo, true);
      window.clearInterval(refreshTimer);
    };
  }, []);

  return (
    <div className="print-hidden pointer-events-none sticky bottom-4 z-10 mt-auto flex pt-10">
      <span className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-card px-3 py-1.5 text-xs text-content-tertiary">
        {words} {words === 1 ? "word" : "words"}
        <span aria-hidden>·</span>
        {characters} {characters === 1 ? "character" : "characters"}
        {pageInfo && (
          <>
            <span aria-hidden>·</span>
            Page {pageInfo.current} of {pageInfo.total}
          </>
        )}
      </span>
    </div>
  );
}
