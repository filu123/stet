"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  Loader2,
  MessageCircleQuestion,
  Palette,
  ScanSearch,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { readApiKey } from "@/features/settings";
import { cn } from "@/lib/utils/cn";
import { useAiReviewStore } from "@/stores/ai-review-store";
import { useSettingsStore } from "@/stores/settings-store";

import { askAboutDocument } from "../lib/ask-service";
import { FORMAT_STYLES, formatDocument, type FormatStyle } from "../lib/format-service";
import { buildDocumentTextIndex } from "../lib/position-mapper";

interface AiActionMenuProps {
  editor: Editor;
  onAnalyze: () => void;
  onClose: () => void;
}

type MenuView = "menu" | "format" | "ask";

/**
 * The popup behind the AI button: Analyze (document review), Format
 * (style-based real formatting), and Ask a question (single-turn Q&A).
 */
export function AiActionMenu({ editor, onAnalyze, onClose }: AiActionMenuProps) {
  const [view, setView] = useState<MenuView>("menu");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const [busyStyleId, setBusyStyleId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const requireApiKey = (): string | null => {
    const settings = useSettingsStore.getState();
    const apiKey = readApiKey(settings.provider);
    if (!apiKey) {
      useAiReviewStore
        .getState()
        .failReview("Add your API key first — open AI settings (gear icon, top right).");
      onClose();
      return null;
    }
    return apiKey;
  };

  const handleFormat = async (style: FormatStyle) => {
    if (busyStyleId) return;
    const apiKey = requireApiKey();
    if (!apiKey) return;

    setBusyStyleId(style.id);
    try {
      const appliedCount = await formatDocument(
        editor,
        style,
        useSettingsStore.getState(),
        apiKey,
      );
      useAiReviewStore
        .getState()
        .failReview(
          appliedCount > 0
            ? `Formatted with "${style.label}" (${appliedCount} touches) — ⌘Z to undo. ✓`
            : "The AI found nothing it wanted to format in this document.",
        );
      onClose();
    } catch (error) {
      useAiReviewStore
        .getState()
        .failReview(error instanceof Error ? error.message : "Formatting failed — try again.");
      onClose();
    } finally {
      setBusyStyleId(null);
    }
  };

  const handleAsk = async () => {
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length === 0 || isAsking) return;
    const apiKey = requireApiKey();
    if (!apiKey) return;

    setIsAsking(true);
    setAnswer(null);
    try {
      const documentText = buildDocumentTextIndex(editor.state.doc).text;
      const response = await askAboutDocument(
        documentText,
        trimmedQuestion,
        useSettingsStore.getState(),
        apiKey,
      );
      setAnswer(response);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "That didn't work — try again.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="dialog-pop absolute right-0 bottom-full z-40 mb-2 w-72 rounded-xl border border-border-subtle bg-surface-card p-1.5">
      {view === "menu" && (
        <div className="flex flex-col">
          <MenuItem
            icon={<ScanSearch className="size-4 text-accent" aria-hidden />}
            label="Analyze"
            description="Review for issues and mark them up"
            onClick={() => {
              onClose();
              onAnalyze();
            }}
          />
          <MenuItem
            icon={<Palette className="size-4 text-accent" aria-hidden />}
            label="Format"
            description="Style the document with marks"
            onClick={() => setView("format")}
          />
          <MenuItem
            icon={<MessageCircleQuestion className="size-4 text-accent" aria-hidden />}
            label="Ask a question"
            description="About your document, or anything"
            onClick={() => setView("ask")}
          />
        </div>
      )}

      {view === "format" && (
        <div className="flex flex-col">
          <BackHeader title="Format" onBack={() => setView("menu")} />
          {FORMAT_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              disabled={busyStyleId !== null}
              onClick={() => void handleFormat(style)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover",
                busyStyleId !== null && busyStyleId !== style.id && "opacity-40",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {busyStyleId === style.id && (
                  <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
                )}
                {style.label}
              </span>
              <span className="text-xs text-content-tertiary">{style.description}</span>
            </button>
          ))}
        </div>
      )}

      {view === "ask" && (
        <div className="flex flex-col gap-2 p-1">
          <BackHeader title="Ask AI" onBack={() => setView("menu")} />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleAsk();
              }
            }}
            placeholder="What should I edit? Is my intro clear? …"
            rows={3}
            className="w-full resize-none rounded-lg border border-border-subtle bg-surface-app px-2.5 py-2 text-sm placeholder:text-content-tertiary focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            disabled={isAsking || question.trim().length === 0}
            onClick={() => void handleAsk()}
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isAsking ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Ask"}
          </button>
          {answer && (
            <p className="max-h-56 overflow-y-auto rounded-lg bg-surface-callout px-2.5 py-2 text-sm leading-6 whitespace-pre-wrap">
              {answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-content-tertiary">{description}</span>
      </span>
    </button>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1 px-1 pt-0.5 pb-1.5">
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        className="flex size-6 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <span className="text-xs font-semibold tracking-wider text-content-tertiary uppercase">
        {title}
      </span>
    </div>
  );
}
