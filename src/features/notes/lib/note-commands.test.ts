import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { buildEditorExtensions } from "@/features/editor/lib/editor-extensions";

import { collectAnchoredNotes } from "./note-commands";
import type { NoteMessage } from "./note-types";

const schema = getSchema(buildEditorExtensions());

function noteMarkJson(noteId: string, messages: NoteMessage[]) {
  return { type: "note", attrs: { noteId, quote: "q", createdAt: "2026-01-01T00:00:00Z", messages } };
}

function message(body: string): NoteMessage {
  return { id: `m-${body}`, body, createdAt: "2026-01-01T00:00:00Z" };
}

describe("collectAnchoredNotes", () => {
  it("collects committed notes in document order", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "one ", marks: [noteMarkJson("b", [message("second note")])] },
            { type: "text", text: "two ", marks: [noteMarkJson("a", [message("first note")])] },
          ],
        },
      ],
    });

    const notes = collectAnchoredNotes(doc);
    expect(notes.map((n) => n.id)).toEqual(["b", "a"]); // ordered by position, not id
    expect(notes[0].messages[0].body).toBe("second note");
  });

  it("merges a note mark split across ranges into one entry", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "start ", marks: [noteMarkJson("x", [message("hi")])] },
            { type: "text", text: "bold", marks: [noteMarkJson("x", [message("hi")]), { type: "bold" }] },
            { type: "text", text: " end", marks: [noteMarkJson("x", [message("hi")])] },
          ],
        },
      ],
    });

    const notes = collectAnchoredNotes(doc);
    expect(notes).toHaveLength(1);
    expect(notes[0].from).toBeLessThan(notes[0].to);
  });

  it("returns an empty list for a doc with no notes", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "plain" }] }],
    });
    expect(collectAnchoredNotes(doc)).toEqual([]);
  });
});
