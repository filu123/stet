"use client";

import { useEffect, useState, type KeyboardEvent } from "react";

import { Check, Link2, Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";

import { normalizeUrl } from "../lib/normalize-url";

interface LinkControlProps {
  editor: Editor;
  isActive: boolean;
}

/** Link button + popover to add, edit, or remove a link on the selection. */
export function LinkControl({ editor, isActive }: LinkControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const open = () => {
    setUrl((editor.getAttributes("link").href as string) ?? "");
    setIsOpen(true);
  };

  const apply = () => {
    const href = normalizeUrl(url);
    if (!href) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setIsOpen(false);
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    }
  };

  return (
    <div className="relative">
      <ToolbarButton
        label="Link"
        isActive={isActive || isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
      >
        <Link2 className="size-3.5" aria-hidden />
      </ToolbarButton>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setIsOpen(false)} />
          <div className="dialog-pop absolute top-full left-0 z-40 mt-2 flex w-64 items-center gap-1 rounded-xl border border-border-subtle bg-surface-card p-1.5">
            <input
              autoFocus
              type="url"
              value={url}
              placeholder="Paste or type a link…"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={handleKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
              className="min-w-0 flex-1 rounded-lg bg-surface-app px-2.5 py-1.5 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none"
            />
            {isActive && (
              <button
                type="button"
                aria-label="Remove link"
                title="Remove link"
                onClick={remove}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              aria-label="Apply link"
              title="Apply link"
              onClick={apply}
              disabled={!normalizeUrl(url)}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Check className="size-3.5" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
