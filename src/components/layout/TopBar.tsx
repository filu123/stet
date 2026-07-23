"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { ChevronRight, House, PanelLeft, Settings, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ExportMenu } from "@/components/layout/ExportMenu";
import { IconButton } from "@/components/ui/IconButton";
import {
  SaveStatusIndicator,
  useActiveDocumentId,
  useDocument,
} from "@/features/documents";
import { IMPORTABLE_EXTENSIONS, importFileAsNewDocument } from "@/features/editor";
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
      const newDocumentId = await importFileAsNewDocument(file);
      router.push(`/document/${newDocumentId}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Import failed.");
    }
  };

  return (
    <header className="app-topbar flex h-16 shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-app px-4">
      {!isSidebarOpen && (
        <IconButton aria-label="Expand sidebar" onClick={onToggleSidebar}>
          <PanelLeft className="size-4" aria-hidden />
        </IconButton>
      )}

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-content-tertiary"
      >
        <Link
          href="/"
          aria-label="Home"
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover hover:text-content-primary"
        >
          <House className="size-4" aria-hidden />
        </Link>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        <span>Documents</span>
        {document && (
          <>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <span className="max-w-56 truncate font-medium text-content-primary">
              {document.title}
            </span>
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <SaveStatusIndicator />

        {document && <ExportMenu document={document} />}
        <IconButton
          aria-label="Import file"
          title="Import file (Markdown, text, HTML, Word)"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
        </IconButton>
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
          accept={IMPORTABLE_EXTENSIONS}
          className="hidden"
          onChange={handleImportFileChange}
        />
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
}
