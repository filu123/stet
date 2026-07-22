import { Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

/**
 * Manual page break: shows as a labeled dashed line in the editor and forces
 * a real page break when printing / exporting to PDF (break-after: page).
 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML() {
    return ["div", { "data-page-break": "", class: "page-break" }];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          // Insert a paragraph along with the break and land the cursor in it —
          // otherwise the atom node stays selected and the next keystroke
          // would replace the break.
          commands.insertContent([{ type: this.name }, { type: "paragraph" }]),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setPageBreak(),
    };
  },
});
