import { Underline } from "@tiptap/extension-underline";

/**
 * Underline with an optional color attribute (rendered as
 * text-decoration-color). Replaces StarterKit's plain underline —
 * StarterKit is configured with `underline: false`.
 */
export const ColoredUnderline = Underline.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.textDecorationColor || null,
        renderHTML: (attributes) =>
          attributes.color ? { style: `text-decoration-color: ${attributes.color}` } : {},
      },
    };
  },
});
