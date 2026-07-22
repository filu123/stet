"use client";

import { useState } from "react";

import {
  Bold,
  Circle,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Redo2,
  SeparatorHorizontal,
  SquareCode,
  Strikethrough,
  TextQuote,
  Underline,
  Undo2,
} from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { ToolbarDivider } from "@/components/ui/ToolbarDivider";

import { HIGHLIGHT_COLORS } from "../lib/highlight-colors";
import { MarkColorSwatches } from "./MarkColorSwatches";
import { PageSetupControl } from "./PageSetupControl";
import { PageWidthControl } from "./PageWidthControl";

interface EditorToolbarProps {
  editor: Editor;
}

/**
 * Fixed docx-style formatting toolbar — always visible above the document.
 * Flat surface, hairline border, no shadow (AGENTS.md).
 */
export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [openColorPicker, setOpenColorPicker] = useState<"underline" | "circle" | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => ({
      canUndo: editorInstance.can().undo(),
      canRedo: editorInstance.can().redo(),
      isBold: editorInstance.isActive("bold"),
      isItalic: editorInstance.isActive("italic"),
      isStrike: editorInstance.isActive("strike"),
      isUnderline: editorInstance.isActive("underline"),
      isCircle: editorInstance.isActive("circle"),
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
      <ToolbarButton
        label="Underline"
        isActive={state.isUnderline}
        onClick={() => setOpenColorPicker((current) => (current === "underline" ? null : "underline"))}
      >
        <Underline className="size-3.5" aria-hidden />
      </ToolbarButton>
      {openColorPicker === "underline" && (
        <MarkColorSwatches
          variant="underline"
          isColorActive={(color) => editor.isActive("underline", { color })}
          onPick={(color) => chain().toggleMark("underline", { color }).run()}
        />
      )}
      <ToolbarButton
        label="Circle text"
        isActive={state.isCircle}
        onClick={() => setOpenColorPicker((current) => (current === "circle" ? null : "circle"))}
      >
        <Circle className="size-3.5 text-ai-circle" aria-hidden />
      </ToolbarButton>
      {openColorPicker === "circle" && (
        <MarkColorSwatches
          variant="circle"
          isColorActive={(color) => editor.isActive("circle", { color })}
          onPick={(color) => chain().toggleCircle({ color }).run()}
        />
      )}
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
      <ToolbarButton label="Insert page break (⌘↵)" onClick={() => chain().setPageBreak().run()}>
        <SeparatorHorizontal className="size-3.5" aria-hidden />
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

      <div className="ml-auto flex items-center gap-0.5 pl-2">
        <ToolbarDivider />
        <PageWidthControl />
        <PageSetupControl />
      </div>
    </div>
  );
}
