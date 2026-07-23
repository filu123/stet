"use client";

import { useEffect, useState } from "react";

import {
  ChevronDown,
  Download,
  FileCode,
  FileText,
  FileType,
  Hash,
  Printer,
} from "lucide-react";

import {
  exportDocumentAsDocx,
  exportDocumentAsHtml,
  exportDocumentAsMarkdown,
  exportDocumentAsPdf,
  exportDocumentAsPlainText,
} from "@/features/editor";
import type { EditorDocument } from "@/types/document";

interface ExportMenuProps {
  document: EditorDocument;
}

interface ExportFormat {
  label: string;
  hint: string;
  icon: typeof Download;
  run: (document: EditorDocument) => void | Promise<void>;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { label: "Markdown", hint: ".md", icon: Hash, run: exportDocumentAsMarkdown },
  { label: "Word", hint: ".docx", icon: FileType, run: exportDocumentAsDocx },
  { label: "HTML", hint: ".html", icon: FileCode, run: exportDocumentAsHtml },
  { label: "Plain text", hint: ".txt", icon: FileText, run: exportDocumentAsPlainText },
  { label: "PDF", hint: "print", icon: Printer, run: exportDocumentAsPdf },
];

/** Dropdown that exports the active document in any supported format. */
export function ExportMenu({ document }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = async (format: ExportFormat) => {
    setIsOpen(false);
    try {
      await format.run(document);
    } catch {
      window.alert(`Could not export as ${format.label}.`);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-card px-3 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
      >
        <Download className="size-3.5" aria-hidden />
        Export
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setIsOpen(false)} />
          <div
            role="menu"
            className="dialog-pop absolute top-full right-0 z-40 mt-2 flex w-52 flex-col gap-0.5 rounded-xl border border-border-subtle bg-surface-card p-1.5"
          >
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format.label}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(format)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
              >
                <format.icon className="size-4 shrink-0 opacity-70" aria-hidden />
                <span className="flex-1 font-medium">{format.label}</span>
                <span className="text-xs text-content-tertiary">{format.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
