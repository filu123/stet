import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";

import { useNotesUiStore } from "@/stores/notes-ui-store";

import type { AnchoredNote, NoteMessage } from "./note-types";

interface Range {
  from: number;
  to: number;
}

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Scanning the whole doc on every keystroke would be wasteful; the doc node is
// immutable, so cache by its identity — selection-only changes reuse the result.
const scanCache = new WeakMap<ProseMirrorNode, AnchoredNote[]>();

/** All note threads in the document, ordered by anchor position. */
export function collectAnchoredNotes(doc: ProseMirrorNode): AnchoredNote[] {
  const cached = scanCache.get(doc);
  if (cached) return cached;

  const byId = new Map<string, AnchoredNote>();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((candidate) => candidate.type.name === "note");
    const noteId = mark?.attrs.noteId as string | undefined;
    if (!mark || !noteId) return;

    const from = pos;
    const to = pos + node.nodeSize;
    const existing = byId.get(noteId);
    if (existing) {
      existing.from = Math.min(existing.from, from);
      existing.to = Math.max(existing.to, to);
    } else {
      byId.set(noteId, {
        id: noteId,
        quote: (mark.attrs.quote as string) || node.text || "",
        createdAt: (mark.attrs.createdAt as string) || nowIso(),
        messages: (mark.attrs.messages as NoteMessage[]) ?? [],
        from,
        to,
      });
    }
  });

  const notes = Array.from(byId.values()).sort((a, b) => a.from - b.from);
  scanCache.set(doc, notes);
  return notes;
}

function findNoteRanges(doc: ProseMirrorNode, noteId: string): Range[] {
  const ranges: Range[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const hasNote = node.marks.some(
      (mark) => mark.type.name === "note" && mark.attrs.noteId === noteId,
    );
    if (hasNote) ranges.push({ from: pos, to: pos + node.nodeSize });
  });
  return ranges;
}

/** Begins a draft note from the current selection (no mark yet — see NotesPanel). */
export function beginNoteDraft(editor: Editor): void {
  const { from, to } = editor.state.selection;
  if (from === to) return;
  const quote = editor.state.doc.textBetween(from, to, " ").trim();
  useNotesUiStore.getState().startDraft({ from, to, quote });
}

/** Anchors a brand-new note (its first comment) over a range. */
export function createNote(
  editor: Editor,
  range: Range,
  quote: string,
  firstMessage: NoteMessage,
): string {
  const noteId = createId();
  const markType = editor.state.schema.marks.note;
  const mark = markType.create({
    noteId,
    quote,
    createdAt: firstMessage.createdAt,
    messages: [firstMessage],
  });
  editor.view.dispatch(editor.state.tr.addMark(range.from, range.to, mark));
  return noteId;
}

/** Replaces a note thread's messages, preserving its other attributes. */
export function setNoteMessages(editor: Editor, noteId: string, messages: NoteMessage[]): void {
  const { state } = editor;
  const ranges = findNoteRanges(state.doc, noteId);
  if (ranges.length === 0) return;

  const markType = state.schema.marks.note;
  const anchorNode = state.doc.nodeAt(ranges[0].from);
  const baseAttrs =
    anchorNode?.marks.find((mark) => mark.type.name === "note" && mark.attrs.noteId === noteId)
      ?.attrs ?? {};

  let transaction = state.tr;
  for (const range of ranges) {
    transaction = transaction.addMark(
      range.from,
      range.to,
      markType.create({ ...baseAttrs, messages }),
    );
  }
  editor.view.dispatch(transaction);
}

/** Removes a note entirely (resolve = clear the anchor). */
export function removeNote(editor: Editor, noteId: string): void {
  const { state } = editor;
  const ranges = findNoteRanges(state.doc, noteId);
  if (ranges.length === 0) return;

  const markType = state.schema.marks.note;
  let transaction = state.tr;
  for (const range of ranges) {
    transaction = transaction.removeMark(range.from, range.to, markType);
  }
  editor.view.dispatch(transaction);
}

/** Selects a note's anchor and scrolls it into view. */
export function scrollToNote(editor: Editor, range: Range): void {
  editor.chain().setTextSelection(range).scrollIntoView().run();
}
