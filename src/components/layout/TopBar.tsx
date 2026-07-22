"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Download, Folder, PanelLeft, Settings, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { IconButton } from "@/components/ui/IconButton";
import {
  SaveStatusIndicator,
  useActiveDocumentId,
  useDocument,
} from "@/features/documents";
import {
  exportDocumentAsMarkdown,
  importMarkdownAsNewDocument,
} from "@/features/editor";
import { SettingsDialog } from "@/features/settings";

interface TopBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ isSidebarOpen, onToggleSidebar }: TopBarProps) {
  const activeDocumentId = useActiveDocumentId();
  const { document } = useDocument(activeDocumentId);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file later
    if (!file) return;

    try {
      const newDocumentId = await importMarkdownAsNewDocument(file);
      router.push(`/document/${newDocumentId}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Import failed.");
    }
  };

  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-2">
      <div className="justify-self-start">
        <IconButton
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isSidebarOpen}
          onClick={onToggleSidebar}
        >
          <PanelLeft className="size-4" aria-hidden />
        </IconButton>
      </div>

      {/* Centered breadcrumb, Craft-style */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-content-tertiary"
      >
        <Folder className="size-3.5" aria-hidden />
        <span>Documents</span>
        {document && (
          <>
            <span aria-hidden>/</span>
            <span className="max-w-64 truncate font-medium text-content-secondary">
              {document.title}
            </span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-1 justify-self-end pr-1">
        <SaveStatusIndicator />
        <IconButton
          aria-label="Import Markdown file"
          title="Import Markdown file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
        </IconButton>
        {document && (
          <IconButton
            aria-label="Export as Markdown"
            title="Export as Markdown"
            onClick={() => exportDocumentAsMarkdown(document)}
          >
            <Download className="size-4" aria-hidden />
          </IconButton>
        )}
        <IconButton
          aria-label="AI settings"
          title="AI settings"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="size-4" aria-hidden />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={handleImportFileChange}
        />
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
}
