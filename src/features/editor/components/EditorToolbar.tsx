"use client";

import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Redo2,
  SquareCode,
  Strikethrough,
  TextQuote,
  Undo2,
} from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { ToolbarDivider } from "@/components/ui/ToolbarDivider";

interface EditorToolbarProps {
  editor: Editor;
}

/** The four Craft-style highlight pills (values are theme tokens, dark-mode aware). */
const HIGHLIGHT_COLORS = [
  { name: "yellow", cssValue: "var(--pill-yellow-bg)" },
  { name: "green", cssValue: "var(--pill-green-bg)" },
  { name: "blue", cssValue: "var(--pill-blue-bg)" },
  { name: "purple", cssValue: "var(--pill-purple-bg)" },
] as const;

/**
 * Fixed docx-style formatting toolbar — always visible above the document.
 * Flat surface, hairline border, no shadow (AGENTS.md).
 */
export function EditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => ({
      canUndo: editorInstance.can().undo(),
      canRedo: editorInstance.can().redo(),
      isBold: editorInstance.isActive("bold"),
      isItalic: editorInstance.isActive("italic"),
      isStrike: editorInstance.isActive("strike"),
      isCode: editorInstance.isActive("code"),
      isHeading1: editorInstance.isActive("heading", { level: 1 }),
      isHeading2: editorInstance.isActive("heading", { level: 2 }),
      isHeading3: editorInstance.isActive("heading", { level: 3 }),
      isBulletList: editorInstance.isActive("bulletList"),
      isOrderedList: editorInstance.isActive("orderedList"),
      isBlockquote: editorInstance.isActive("blockquote"),
      isCodeBlock: editorInstance.isActive("codeBlock"),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-0.5 overflow-x-auto"
    >
      <ToolbarButton label="Undo" isDisabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Redo" isDisabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className="size-3.5" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Heading 1" isActive={state.isHeading1} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" isActive={state.isHeading2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Heading 3" isActive={state.isHeading3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-3.5" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Bold" isActive={state.isBold} onClick={() => chain().toggleBold().run()}>
        <Bold className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Italic" isActive={state.isItalic} onClick={() => chain().toggleItalic().run()}>
        <Italic className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough" isActive={state.isStrike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Inline code" isActive={state.isCode} onClick={() => chain().toggleCode().run()}>
        <Code className="size-3.5" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Bullet list" isActive={state.isBulletList} onClick={() => chain().toggleBulletList().run()}>
        <List className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" isActive={state.isOrderedList} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Quote" isActive={state.isBlockquote} onClick={() => chain().toggleBlockquote().run()}>
        <TextQuote className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Code block" isActive={state.isCodeBlock} onClick={() => chain().toggleCodeBlock().run()}>
        <SquareCode className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
        <Minus className="size-3.5" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      {HIGHLIGHT_COLORS.map((color) => (
        <ToolbarButton
          key={color.name}
          label={`Highlight ${color.name}`}
          isActive={editor.isActive("highlight", { color: color.cssValue })}
          onClick={() => chain().toggleHighlight({ color: color.cssValue }).run()}
        >
          <span
            className="size-3.5 rounded-full border border-border-subtle"
            style={{ backgroundColor: color.cssValue }}
            aria-hidden
          />
        </ToolbarButton>
      ))}
    </div>
  );
}
