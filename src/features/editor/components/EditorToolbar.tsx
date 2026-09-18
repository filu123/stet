"use client";

import { Redo2, Undo2 } from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { ToolbarDivider } from "@/components/ui/ToolbarDivider";

import { BookModeButton } from "./BookModeButton";
import { FontControl } from "./FontControl";
import { LastHighlightButton } from "./LastHighlightButton";
import { PageSetupControl } from "./PageSetupControl";
import { PageWidthControl } from "./PageWidthControl";

interface EditorToolbarProps {
  editor: Editor;
}

/**
 * The fixed toolbar above the document — deliberately minimal.
 *
 * Text formatting lives in the selection bubble menu, not here: on a tablet
 * you mark up far more than you restyle, so the bar keeps only history,
 * navigation, and page-level settings. Flat surface, hairline border, no
 * shadow (AGENTS.md).
 */
export function EditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => ({
      canUndo: editorInstance.can().undo(),
      canRedo: editorInstance.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div role="toolbar" aria-label="Document" className="flex flex-wrap items-center gap-0.5">
      <ToolbarButton label="Undo" isDisabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className="size-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Redo" isDisabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className="size-3.5" aria-hidden />
      </ToolbarButton>

      <div className="ml-auto flex items-center gap-0.5 pl-2">
        <LastHighlightButton editor={editor} />
        <BookModeButton />
        <ToolbarDivider />
        <FontControl />
        <PageWidthControl />
        <PageSetupControl />
      </div>
    </div>
  );
}
