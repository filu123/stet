"use client";

import { useState } from "react";

import { Check, MessageSquarePlus } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { cn } from "@/lib/utils/cn";
import { useNotesUiStore } from "@/stores/notes-ui-store";

import { formatRelativeTime } from "../lib/format-relative-time";
import { createId, nowIso, removeNote, scrollToNote, setNoteMessages } from "../lib/note-commands";
import type { AnchoredNote } from "../lib/note-types";
import { NoteComposer } from "./NoteComposer";

interface NoteThreadProps {
  editor: Editor;
  note: AnchoredNote;
  isFocused: boolean;
}

/** One note: its anchored quote, the comment thread, a reply box, and resolve. */
export function NoteThread({ editor, note, isFocused }: NoteThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const focusNote = useNotesUiStore((state) => state.focusNote);

  const handleSelect = () => {
    focusNote(note.id);
    scrollToNote(editor, { from: note.from, to: note.to });
  };

  const handleReply = (body: string) => {
    setNoteMessages(editor, note.id, [
      ...note.messages,
      { id: createId(), body, createdAt: nowIso() },
    ]);
    setIsReplying(false);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border bg-surface-card p-3 transition-colors",
        isFocused ? "border-accent" : "border-border-subtle",
      )}
    >
      <button
        type="button"
        onClick={handleSelect}
        className="-mx-1 -mt-1 flex items-start gap-2 rounded-lg px-1 pt-1 text-left"
        title="Jump to the highlighted text"
      >
        <span className="w-0.5 shrink-0 self-stretch rounded-full bg-note-anchor" aria-hidden />
        <span className="line-clamp-2 text-xs text-content-tertiary italic">“{note.quote}”</span>
      </button>

      <ul className="flex flex-col gap-2.5">
        {note.messages.map((message) => (
          <li key={message.id} className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-content-tertiary">
              {formatRelativeTime(message.createdAt)}
            </span>
            <p className="text-sm whitespace-pre-wrap text-content-primary">{message.body}</p>
          </li>
        ))}
      </ul>

      {isReplying ? (
        <NoteComposer
          placeholder="Reply…"
          submitLabel="Reply"
          autoFocus
          onSubmit={handleReply}
          onCancel={() => setIsReplying(false)}
        />
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsReplying(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
          >
            <MessageSquarePlus className="size-3.5" aria-hidden />
            Reply
          </button>
          <button
            type="button"
            onClick={() => removeNote(editor, note.id)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
            title="Resolve and remove this note"
          >
            <Check className="size-3.5" aria-hidden />
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}
