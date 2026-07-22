"use client";

import { useEditorState, type Editor } from "@tiptap/react";

interface WordCountPillProps {
  editor: Editor;
}

/** Live "N words · M characters" readout, floating at the card's bottom. */
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

  return (
    // At the end of the document (not sticky) — it must never float over text.
    <div className="print-hidden mt-auto flex pt-10">
      <span className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-card px-3 py-1.5 text-xs text-content-tertiary">
        {words} {words === 1 ? "word" : "words"}
        <span aria-hidden>·</span>
        {characters} {characters === 1 ? "character" : "characters"}
      </span>
    </div>
  );
}
