"use client";

import { useState } from "react";

import { renameDocument } from "../lib/document-repository";

interface DocumentTitleInputProps {
  documentId: string;
  initialTitle: string;
}

/**
 * The document title, edited inline — an input styled as the page h1.
 * Commits on blur or Enter; an empty title falls back to "Untitled".
 */
export function DocumentTitleInput({ documentId, initialTitle }: DocumentTitleInputProps) {
  const [title, setTitle] = useState(initialTitle);

  const commitTitle = () => {
    const trimmedTitle = title.trim() || "Untitled";
    setTitle(trimmedTitle);
    if (trimmedTitle !== initialTitle) {
      void renameDocument(documentId, trimmedTitle);
    }
  };

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commitTitle}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      aria-label="Document title"
      placeholder="Untitled"
      className="w-full bg-transparent text-3xl font-semibold tracking-tight placeholder:text-content-tertiary focus:outline-none"
    />
  );
}
