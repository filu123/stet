"use client";

import { useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils/cn";

interface NoteComposerProps {
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

/** A textarea + submit/cancel used for a note's first comment and for replies. */
export function NoteComposer({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
}: NoteComposerProps) {
  const [body, setBody] = useState("");
  const trimmed = body.trim();

  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
    setBody("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        autoFocus={autoFocus}
        value={body}
        placeholder={placeholder}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        className="w-full resize-none rounded-lg border border-border-subtle bg-surface-app px-2.5 py-2 text-sm text-content-primary transition-colors placeholder:text-content-tertiary focus:border-accent focus:outline-none"
      />
      <div className="flex items-center justify-end gap-1.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-hover"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!trimmed}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-opacity",
            trimmed ? "bg-accent hover:opacity-90" : "bg-accent opacity-40",
          )}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
