"use client";

import { useState } from "react";

import {
  Bold,
  Circle,
  Code,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  List,
  Strikethrough,
  TextQuote,
  Underline,
} from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { ToolbarDivider } from "@/components/ui/ToolbarDivider";
import { AiBubbleMenuActions } from "@/features/ai-assistant";

import { MarkColorSwatches } from "./MarkColorSwatches";

interface FormattingBubbleMenuProps {
  editor: Editor;
}

/**
 * Craft-style floating formatting menu — appears over selected text.
 * Flat surface, hairline border, no shadow (AGENTS.md).
 */
export function FormattingBubbleMenu({ editor }: FormattingBubbleMenuProps) {
  const [openColorPicker, setOpenColorPicker] = useState<
    "underline" | "circle" | "highlight" | null
  >(null);
  const activeStates = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => ({
      isBold: editorInstance.isActive("bold"),
      isItalic: editorInstance.isActive("italic"),
      isStrike: editorInstance.isActive("strike"),
      isUnderline: editorInstance.isActive("underline"),
      isCircle: editorInstance.isActive("circle"),
      isCode: editorInstance.isActive("code"),
      isHeading1: editorInstance.isActive("heading", { level: 1 }),
      isHeading2: editorInstance.isActive("heading", { level: 2 }),
      isBulletList: editorInstance.isActive("bulletList"),
      isBlockquote: editorInstance.isActive("blockquote"),
      isHighlighted: editorInstance.isActive("highlight"),
    }),
  });

  return (
    <BubbleMenu editor={editor} options={{ placement: "top", offset: 8 }}>
      <div className="flex items-center gap-0.5 rounded-xl border border-border-subtle bg-surface-card p-1">
        <ToolbarButton
          label="Bold"
          isActive={activeStates.isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          isActive={activeStates.isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          isActive={activeStates.isStrike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          isActive={activeStates.isUnderline}
          onClick={() =>
            setOpenColorPicker((current) => (current === "underline" ? null : "underline"))
          }
        >
          <Underline className="size-3.5" aria-hidden />
        </ToolbarButton>
        {openColorPicker === "underline" && (
          <MarkColorSwatches
            variant="underline"
            isColorActive={(color) => editor.isActive("underline", { color })}
            onPick={(color) => editor.chain().focus().toggleMark("underline", { color }).run()}
          />
        )}
        <ToolbarButton
          label="Circle text"
          isActive={activeStates.isCircle}
          onClick={() =>
            setOpenColorPicker((current) => (current === "circle" ? null : "circle"))
          }
        >
          <Circle className="size-3.5 text-ai-circle" aria-hidden />
        </ToolbarButton>
        {openColorPicker === "circle" && (
          <MarkColorSwatches
            variant="circle"
            isColorActive={(color) => editor.isActive("circle", { color })}
            onPick={(color) => editor.chain().focus().toggleCircle({ color }).run()}
          />
        )}
        <ToolbarButton
          label="Inline code"
          isActive={activeStates.isCode}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="size-3.5" aria-hidden />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Heading 1"
          isActive={activeStates.isHeading1}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          isActive={activeStates.isHeading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          isActive={activeStates.isBulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          isActive={activeStates.isBlockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <TextQuote className="size-3.5" aria-hidden />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Highlight"
          isActive={activeStates.isHighlighted || openColorPicker === "highlight"}
          onClick={() =>
            setOpenColorPicker((current) => (current === "highlight" ? null : "highlight"))
          }
        >
          <Highlighter className="size-3.5" aria-hidden />
        </ToolbarButton>
        {openColorPicker === "highlight" && (
          <MarkColorSwatches
            variant="highlight"
            isColorActive={(color) => editor.isActive("highlight", { color })}
            onPick={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
            onRemove={
              activeStates.isHighlighted
                ? () => editor.chain().focus().unsetHighlight().run()
                : undefined
            }
          />
        )}

        <AiBubbleMenuActions editor={editor} />
      </div>
    </BubbleMenu>
  );
}
