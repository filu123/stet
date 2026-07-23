"use client";

import { useEditorState, type Editor } from "@tiptap/react";

import { collectAnchoredNotes } from "../lib/note-commands";
import type { AnchoredNote } from "../lib/note-types";

/** Live list of the document's notes (only committed ones, ordered by position). */
export function useDocumentNotes(editor: Editor | null): AnchoredNote[] {
  const notes = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      instance
        ? collectAnchoredNotes(instance.state.doc).filter((note) => note.messages.length > 0)
        : [],
    equalityFn: (a, b) => {
      if (!a || !b) return a === b;
      return (
        a.length === b.length &&
        a.every((note, index) => {
          const other = b[index];
          return (
            note.id === other.id &&
            note.from === other.from &&
            note.messages.length === other.messages.length &&
            note.messages[note.messages.length - 1]?.body ===
              other.messages[other.messages.length - 1]?.body
          );
        })
      );
    },
  });
  return notes ?? [];
}
