"use client";

import { Highlighter } from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";

import { findLastHighlightRange } from "../lib/highlight-navigator";

interface LastHighlightButtonProps {
  editor: Editor;
}

/**
 * Jumps to the last highlighted passage in the document and selects it, so
 * you can pick up where you stopped marking up. Disabled when the document
 * has no highlights.
 */
export function LastHighlightButton({ editor }: LastHighlightButtonProps) {
  const hasHighlight = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) =>
      findLastHighlightRange(editorInstance.state.doc) !== null,
  });

  const handleClick = () => {
    const range = findLastHighlightRange(editor.state.doc);
    if (!range) return;
    editor.chain().focus().setTextSelection(range).scrollIntoView().run();
  };

  return (
    <ToolbarButton
      label="Go to last highlight"
      isDisabled={!hasHighlight}
      onClick={handleClick}
    >
      <Highlighter className="size-3.5" aria-hidden />
    </ToolbarButton>
  );
}
