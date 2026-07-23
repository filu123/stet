"use client";

import { MessagesSquare, X } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { cn } from "@/lib/utils/cn";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useNotesUiStore } from "@/stores/notes-ui-store";

import { createId, createNote, nowIso } from "../lib/note-commands";
import type { AnchoredNote } from "../lib/note-types";
import { NoteComposer } from "./NoteComposer";
import { NoteThread } from "./NoteThread";

interface NotesPanelProps {
  editor: Editor;
  notes: AnchoredNote[];
}

/** Right-side comments sidebar: draft composer, then the thread list. */
export function NotesPanel({ editor, notes }: NotesPanelProps) {
  const isMobile = useIsMobile();
  const { isPanelOpen, draft, focusedNoteId, closePanel, clearDraft, focusNote } =
    useNotesUiStore();

  const handleCreate = (body: string) => {
    if (!draft) return;
    const noteId = createNote(
      editor,
      { from: draft.from, to: draft.to },
      draft.quote,
      { id: createId(), body, createdAt: nowIso() },
    );
    clearDraft();
    focusNote(noteId);
  };

  return (
    <>
      {isMobile && isPanelOpen && (
        <div
          className="overlay-fade fixed inset-0 z-30 bg-overlay md:hidden"
          aria-hidden
          onClick={closePanel}
        />
      )}

      <aside
        aria-label="Notes"
        aria-hidden={!isPanelOpen}
        className={cn(
          "fixed top-16 right-0 bottom-0 z-40 flex w-80 flex-col border-l border-border-subtle bg-surface-app",
          "transition-transform duration-300 ease-in-out max-md:w-full",
          isPanelOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-4">
          <MessagesSquare className="size-4 text-content-secondary" aria-hidden />
          <h2 className="flex-1 text-sm font-semibold text-content-primary">
            Notes
            {notes.length > 0 && (
              <span className="ml-1.5 text-content-tertiary">{notes.length}</span>
            )}
          </h2>
          <button
            type="button"
            aria-label="Close notes"
            onClick={closePanel}
            className="flex size-7 items-center justify-center rounded-lg text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          {draft && (
            <div className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-surface-card p-3">
              <div className="flex items-start gap-2">
                <span className="w-0.5 shrink-0 self-stretch rounded-full bg-note-anchor" aria-hidden />
                <span className="line-clamp-2 text-xs text-content-tertiary italic">
                  “{draft.quote}”
                </span>
              </div>
              <NoteComposer
                placeholder="Add a note…"
                submitLabel="Comment"
                autoFocus
                onSubmit={handleCreate}
                onCancel={clearDraft}
              />
            </div>
          )}

          {notes.map((note) => (
            <NoteThread
              key={note.id}
              editor={editor}
              note={note}
              isFocused={note.id === focusedNoteId}
            />
          ))}

          {!draft && notes.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <MessagesSquare className="size-6 text-content-tertiary" aria-hidden />
              <p className="text-sm text-content-secondary">No notes yet</p>
              <p className="text-xs text-content-tertiary">
                Select text and choose “Add note” to leave a comment.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
