"use client";

import { useEffect, useState } from "react";

import { Smile } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";

import { EmojiPicker } from "./EmojiPicker";

interface EmojiControlProps {
  editor: Editor;
}

/** Toolbar button + popover that inserts an emoji at the cursor. */
export function EmojiControl({ editor }: EmojiControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const insert = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <ToolbarButton
        label="Emoji"
        isActive={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Smile className="size-3.5" aria-hidden />
      </ToolbarButton>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setIsOpen(false)} />
          <div className="dialog-pop absolute top-full left-0 z-40 mt-2 rounded-xl border border-border-subtle bg-surface-card p-2">
            <EmojiPicker onSelect={insert} />
          </div>
        </>
      )}
    </div>
  );
}
