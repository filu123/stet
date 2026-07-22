"use client";

import { EditorContent, type Editor } from "@tiptap/react";

import { FormattingBubbleMenu } from "@/features/editor/components/FormattingBubbleMenu";

interface DocumentEditorProps {
  editor: Editor | null;
}

/** Renders the editable content area plus its selection bubble menu. */
export function DocumentEditor({ editor }: DocumentEditorProps) {
  return (
    <>
      <EditorContent editor={editor} />
      {editor && <FormattingBubbleMenu editor={editor} />}
    </>
  );
}
