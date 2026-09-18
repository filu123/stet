"use client";

import { useEffect, useRef, useState } from "react";

import {
  ChevronLeft,
  Loader2,
  Mic,
  MicOff,
  MessageCircleQuestion,
  Palette,
  RotateCcw,
  ScanSearch,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { readApiKey } from "@/features/settings";
import { cn } from "@/lib/utils/cn";
import { useAiReviewStore } from "@/stores/ai-review-store";
import { useSettingsStore } from "@/stores/settings-store";

import { askAboutDocument, type AiChatMessage } from "../lib/ask-service";
import { FORMAT_STYLES, formatDocument, type FormatStyle } from "../lib/format-service";
import { startGeminiLiveSession, type GeminiLiveSession } from "../lib/gemini-live-client";
import { buildDocumentTextIndex } from "../lib/position-mapper";

interface AiActionMenuProps {
  editor: Editor;
  chatMessages: AiChatMessage[];
  onChatMessagesChange: (messages: AiChatMessage[]) => void;
  onAnalyze: () => void;
  onClose: () => void;
}

type MenuView = "menu" | "format" | "ask";
type VoiceState = "idle" | "connecting" | "listening" | "speaking" | "error";

/**
 * The popup behind the AI button: Analyze (document review), Format
 * (style-based real formatting), and a conversation grounded in this document.
 */
export function AiActionMenu({
  editor,
  chatMessages,
  onChatMessagesChange,
  onAnalyze,
  onClose,
}: AiActionMenuProps) {
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
  const [isAsking, setIsAsking] = useState(false);
  const messages = chatMessages;
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceInputTranscript, setVoiceInputTranscript] = useState("");
  const [voiceOutputTranscript, setVoiceOutputTranscript] = useState("");
  const voiceSessionRef = useRef<GeminiLiveSession | null>(null);
  const voiceAttemptRef = useRef(0);
  const voiceInputRef = useRef("");
  const voiceOutputRef = useRef("");
  const chatMessagesRef = useRef(messages);
  const isVoiceActive =
    voiceState === "connecting" || voiceState === "listening" || voiceState === "speaking";

  useEffect(() => {
    chatMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => voiceSessionRef.current?.stop();
  }, []);

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
    setQuestion("");
    const previousMessages = messages;
    onChatMessagesChange([...previousMessages, { role: "user", content: trimmedQuestion }]);
    try {
      const documentText = buildDocumentTextIndex(editor.state.doc).text;
      const response = await askAboutDocument(
        documentText,
        trimmedQuestion,
        useSettingsStore.getState(),
        apiKey,
        previousMessages,
      );
      onChatMessagesChange([
        ...previousMessages,
        { role: "user", content: trimmedQuestion },
        { role: "assistant", content: response },
      ]);
    } catch (error) {
      onChatMessagesChange([
        ...previousMessages,
        { role: "user", content: trimmedQuestion },
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "That didn't work — try again.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const stopVoiceConversation = () => {
    voiceAttemptRef.current += 1;
    voiceSessionRef.current?.stop();
    voiceSessionRef.current = null;
    voiceInputRef.current = "";
    voiceOutputRef.current = "";
    setVoiceInputTranscript("");
    setVoiceOutputTranscript("");
    setVoiceError(null);
    setVoiceState("idle");
  };

  const commitVoiceTurn = () => {
    const input = voiceInputRef.current.trim();
    const output = voiceOutputRef.current.trim();
    if (input || output) {
      onChatMessagesChange([
        ...chatMessagesRef.current,
        ...(input ? [{ role: "user" as const, content: input }] : []),
        ...(output ? [{ role: "assistant" as const, content: output }] : []),
      ]);
    }
    voiceInputRef.current = "";
    voiceOutputRef.current = "";
    setVoiceInputTranscript("");
    setVoiceOutputTranscript("");
  };

  const handleVoiceToggle = async () => {
    if (isVoiceActive) {
      stopVoiceConversation();
      return;
    }

    const settings = useSettingsStore.getState();
    if (settings.provider !== "gemini") {
      setVoiceError("Voice conversations currently use Gemini — select Gemini in AI settings first.");
      setVoiceState("error");
      return;
    }
    const apiKey = requireApiKey();
    if (!apiKey) return;

    const attempt = ++voiceAttemptRef.current;
    setVoiceState("connecting");
    setVoiceError(null);
    voiceInputRef.current = "";
    voiceOutputRef.current = "";
    setVoiceInputTranscript("");
    setVoiceOutputTranscript("");

    try {
      const session = await startGeminiLiveSession({
        apiKey,
        documentText: buildDocumentTextIndex(editor.state.doc).text,
        history: chatMessagesRef.current,
        callbacks: {
          onInputTranscript: (text) => {
            voiceInputRef.current += text;
            setVoiceInputTranscript(voiceInputRef.current);
          },
          onOutputTranscript: (text) => {
            voiceOutputRef.current += text;
            setVoiceOutputTranscript(voiceOutputRef.current);
          },
          onModelAudio: () => setVoiceState("speaking"),
          onTurnComplete: () => {
            commitVoiceTurn();
            setVoiceState("listening");
          },
          onInterrupted: () => {
            voiceOutputRef.current = "";
            setVoiceOutputTranscript("");
            setVoiceState("listening");
          },
          onError: (message) => {
            setVoiceError(message);
            setVoiceState("error");
          },
          onClosed: () => {
            voiceSessionRef.current = null;
            setVoiceState((current) => (current === "error" ? current : "idle"));
          },
        },
      });
      if (attempt !== voiceAttemptRef.current) {
        session.stop();
        return;
      }
      voiceSessionRef.current = session;
      setVoiceState("listening");
    } catch (error) {
      if (attempt !== voiceAttemptRef.current) return;
      setVoiceError(error instanceof Error ? error.message : "Voice conversation failed to start.");
      setVoiceState("error");
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
            label="Talk to this document"
            description="Ask about its ideas, themes, or details"
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
          <BackHeader
            title="Talk to this document"
            onBack={() => setView("menu")}
            action={
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={isVoiceActive ? "Stop voice conversation" : "Start voice conversation"}
                  title={isVoiceActive ? "Stop voice conversation" : "Start voice conversation"}
                  aria-pressed={isVoiceActive}
                  onClick={() => void handleVoiceToggle()}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md transition-colors",
                    isVoiceActive
                      ? "bg-accent-soft text-accent"
                      : "text-content-tertiary hover:bg-surface-hover hover:text-content-primary",
                  )}
                >
                  {voiceState === "connecting" ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : isVoiceActive ? (
                    <MicOff className="size-3.5" aria-hidden />
                  ) : (
                    <Mic className="size-3.5" aria-hidden />
                  )}
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    aria-label="Start a new conversation"
                    title="Start a new conversation"
                    onClick={() => onChatMessagesChange([])}
                    className="flex size-6 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            }
          />
          {(isVoiceActive || voiceError) && (
            <div className="rounded-lg bg-surface-callout px-2.5 py-2 text-xs leading-5 text-content-secondary">
              <div className="flex items-center gap-1.5 font-medium text-content-primary">
                {isVoiceActive && <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />}
                {voiceState === "connecting"
                  ? "Connecting to Gemini voice…"
                  : voiceState === "speaking"
                    ? "Gemini is speaking…"
                    : voiceState === "listening"
                      ? "Listening… speak naturally"
                      : "Voice conversation unavailable"}
              </div>
              {voiceError && <p className="mt-1 text-danger">{voiceError}</p>}
              {voiceInputTranscript && (
                <p className="mt-2 border-t border-border-subtle pt-2">
                  <span className="font-medium text-content-tertiary">You: </span>
                  {voiceInputTranscript}
                </p>
              )}
              {voiceOutputTranscript && (
                <p className="mt-1">
                  <span className="font-medium text-content-tertiary">Gemini: </span>
                  {voiceOutputTranscript}
                </p>
              )}
            </div>
          )}
          {messages.length > 0 ? (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto px-1 py-0.5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-sm leading-5 whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-5 bg-accent text-white"
                      : "mr-2 bg-surface-callout text-content-primary",
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-surface-callout px-2.5 py-2 text-xs leading-5 text-content-secondary">
              Ask about the document’s main ideas, connect two sections, test an argument, or ask
              for a practical example.
            </div>
          )}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleAsk();
              }
            }}
            placeholder="Ask a follow-up about this document…"
            rows={3}
            disabled={isVoiceActive}
            className="w-full resize-none rounded-lg border border-border-subtle bg-surface-app px-2.5 py-2 text-sm placeholder:text-content-tertiary focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            disabled={isAsking || isVoiceActive || question.trim().length === 0}
            onClick={() => void handleAsk()}
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isAsking ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Ask"}
          </button>
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

function BackHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-1 px-1 pt-0.5 pb-1.5">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="truncate text-xs font-semibold tracking-wider text-content-tertiary uppercase">
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}
