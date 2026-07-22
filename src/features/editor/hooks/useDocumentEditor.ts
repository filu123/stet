"use client";

import { useEditor, type Editor } from "@tiptap/react";

import type { TipTapJsonContent } from "@/types/document";

import { buildEditorExtensions } from "../lib/editor-extensions";

/**
 * Creates the configured TipTap editor instance.
 * All editor configuration lives here — components only render it.
 */
export function useDocumentEditor(initialContent: TipTapJsonContent | null): Editor | null {
  return useEditor({
    // Required in Next.js: the editor must not render during SSR (hydration mismatch).
    immediatelyRender: false,
    content: initialContent ?? "",
    extensions: buildEditorExtensions(),
    editorProps: {
      attributes: {
        // Typography lives in globals.css under `.tiptap-content` (element selectors
        // are unavoidable for rich-text content; everything uses design tokens).
        class: "tiptap-content focus:outline-none",
        "aria-label": "Document editor",
      },
    },
  });
}
