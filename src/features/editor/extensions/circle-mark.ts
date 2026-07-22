import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    circle: {
      toggleCircle: () => ReturnType;
    };
  }
}

/**
 * User-applied "circled" text — a rounded border around an inline range,
 * visually matching the AI's circle markup (but a real mark, part of the
 * document, unlike AI decorations).
 */
export const CircleMark = Mark.create({
  name: "circle",

  parseHTML() {
    return [{ tag: "span[data-circle]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-circle": "", class: "user-circle" }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCircle:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
