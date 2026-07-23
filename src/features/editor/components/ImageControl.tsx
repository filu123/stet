"use client";

import { useRef, type ChangeEvent } from "react";

import { ImagePlus } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";

import { insertImageFiles } from "../lib/image-upload";

interface ImageControlProps {
  editor: Editor;
}

/** Toolbar button that inserts one or more images from a file picker. */
export function ImageControl({ editor }: ImageControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    // Copy before clearing — resetting `value` empties the live FileList.
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    if (files.length) await insertImageFiles(editor, files);
  };

  return (
    <>
      <ToolbarButton label="Insert image" onClick={() => inputRef.current?.click()}>
        <ImagePlus className="size-3.5" aria-hidden />
      </ToolbarButton>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
