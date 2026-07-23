import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * The anchor for a note thread. Only `noteId` reaches the DOM (as
 * `data-note-id`, for click handling + the `.note-anchor` highlight); the
 * thread payload rides along in JSON-only attributes so it persists with the
 * document but never leaks into rendered/exported HTML.
 *
 * Owned by the notes feature (not editor/extensions) to keep the
 * editor → notes dependency one-directional, per AGENTS.md.
 */
export const NoteMark = Mark.create({
  name: "note",
  // A note shouldn't grow when you type right after it.
  inclusive: false,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) =>
          attributes.noteId ? { "data-note-id": attributes.noteId } : {},
      },
      quote: { default: "", rendered: false },
      createdAt: { default: null, rendered: false },
      messages: { default: [], rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-note-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "note-anchor" }), 0];
  },
});
