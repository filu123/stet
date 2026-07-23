"use client";

import { useEffect } from "react";

import type { Editor } from "@tiptap/react";

import { insertImageFiles } from "../lib/image-upload";

function hasImageFile(files: FileList | null | undefined): files is FileList {
  return !!files && files.length > 0 && Array.from(files).some((f) => f.type.startsWith("image/"));
}

/** Lets users paste or drag-and-drop images straight into the document. */
export function useImageDropPaste(editor: Editor | null): void {
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const handlePaste = (event: ClipboardEvent) => {
      if (!hasImageFile(event.clipboardData?.files)) return;
      event.preventDefault();
      void insertImageFiles(editor, event.clipboardData!.files);
    };

    const handleDrop = (event: DragEvent) => {
      if (!hasImageFile(event.dataTransfer?.files)) return;
      event.preventDefault();
      const position = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
      void insertImageFiles(editor, event.dataTransfer!.files, position);
    };

    dom.addEventListener("paste", handlePaste);
    dom.addEventListener("drop", handleDrop);
    return () => {
      dom.removeEventListener("paste", handlePaste);
      dom.removeEventListener("drop", handleDrop);
    };
  }, [editor]);
}
