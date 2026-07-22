import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    circle: {
      toggleCircle: (attributes?: { color?: string | null }) => ReturnType;
    };
  }
}

/**
 * User-applied "circled" text — a rounded border around an inline range,
 * visually matching the AI's circle markup (but a real mark, part of the
 * document, unlike AI decorations). Optional color attr sets the border color.
 */
export const CircleMark = Mark.create({
  name: "circle",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.borderColor || null,
        renderHTML: (attributes) =>
          attributes.color ? { style: `border-color: ${attributes.color}` } : {},
      },
    };
  },

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
        (attributes) =>
        ({ commands }) =>
          commands.toggleMark(this.name, attributes),
    };
  },
});
