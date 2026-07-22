"use client";

import {
  Bold,
  Circle,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  Strikethrough,
  TextQuote,
  Underline,
  X,
} from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { ToolbarDivider } from "@/components/ui/ToolbarDivider";
import { AiBubbleMenuActions } from "@/features/ai-assistant";

import { HIGHLIGHT_COLORS } from "../lib/highlight-colors";

interface FormattingBubbleMenuProps {
  editor: Editor;
}

/**
 * Craft-style floating formatting menu — appears over selected text.
 * Flat surface, hairline border, no shadow (AGENTS.md).
 */
export function FormattingBubbleMenu({ editor }: FormattingBubbleMenuProps) {
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
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Circle text"
          isActive={activeStates.isCircle}
          onClick={() => editor.chain().focus().toggleCircle().run()}
        >
          <Circle className="size-3.5 text-ai-circle" aria-hidden />
        </ToolbarButton>
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

        {HIGHLIGHT_COLORS.map((color) => (
          <ToolbarButton
            key={color.name}
            label={`Highlight ${color.name}`}
            isActive={editor.isActive("highlight", { color: color.cssValue })}
            onClick={() =>
              editor.chain().focus().toggleHighlight({ color: color.cssValue }).run()
            }
          >
            <span
              className="size-3.5 rounded-full border border-border-subtle"
              style={{ backgroundColor: color.cssValue }}
              aria-hidden
            />
          </ToolbarButton>
        ))}
        {activeStates.isHighlighted && (
          <ToolbarButton
            label="Remove highlight"
            isActive={false}
            onClick={() => editor.chain().focus().unsetHighlight().run()}
          >
            <X className="size-3.5" aria-hidden />
          </ToolbarButton>
        )}

        <AiBubbleMenuActions editor={editor} />
      </div>
    </BubbleMenu>
  );
}
