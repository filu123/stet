"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import Link from "next/link";
import {
  Bookmark,
  ChevronLeft,
  Gauge,
  List,
  Maximize2,
  Minimize2,
  Settings2,
  Users,
} from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { useFullscreen } from "@/lib/hooks/use-fullscreen";
import { cn } from "@/lib/utils/cn";
import { useReaderStore } from "@/stores/reader-store";

import { useBookReader } from "../hooks/useBookReader";
import { useBookmarks } from "../hooks/useBookmarks";
import { useCharacterGlossary } from "../hooks/useCharacterGlossary";
import { useHighlights } from "../hooks/useHighlights";
import { useReaderGestures } from "../hooks/useReaderGestures";
import { useReadingPacer } from "../hooks/useReadingPacer";
import { useWakeLock } from "../hooks/useWakeLock";
import { popPageStep, previousPageStart, type PageStep } from "../lib/page-fill";
import {
  bookProgress,
  formatEstimate,
  minutesFor,
  nextBreakLabel,
  wordsRemaining,
} from "../lib/reading-position";

import { CharacterGlossaryPanel } from "./CharacterGlossaryPanel";
import { ContentsPanel } from "./ContentsPanel";
import { GestureHint } from "./GestureHint";
import { HighlightPopover } from "./HighlightPopover";
import { PacerControl } from "./PacerControl";
import { PageView, type PageBounds } from "./PageView";
import { ReaderSettingsSheet } from "./ReaderSettingsSheet";
import { ResumeCard } from "./ResumeCard";
import { SpotlightView } from "./SpotlightView";
import { StepView } from "./StepView";

interface ReaderScreenProps {
  bookId: string;
}

/**
 * The reading surface: a book, one piece of it, and the two numbers that keep
 * a wandering reader going — how far in they are, and how near the end of the
 * current scene.
 *
 * Chrome is hidden by default and revealed by tapping the top of the screen.
 * The footer never hides: the finish line is the motivation, so it is the one
 * thing always on the page — and tapping it opens the settings, because a
 * control nobody can find is a control nobody has.
 */
export function ReaderScreen({ bookId }: ReaderScreenProps) {
  const reader = useBookReader(bookId);
  const focusMode = useReaderStore((state) => state.focusMode);
  const fontSize = useReaderStore((state) => state.fontSize);
  const hasSeenGestureHint = useReaderStore((state) => state.hasSeenGestureHint);
  const markGestureHintSeen = useReaderStore((state) => state.markGestureHintSeen);
  const isPacerEnabled = useReaderStore((state) => state.isPacerEnabled);
  const setPacerEnabled = useReaderStore((state) => state.setPacerEnabled);
  const pacerWordsPerMinute = useReaderStore((state) => state.pacerWordsPerMinute);

  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isContentsOpen, setIsContentsOpen] = useState(false);

  const { book, chunks, chunk, chunkIndex } = reader;
  const chapterIndex = chunk?.chapterIndex ?? 0;

  const glossary = useCharacterGlossary(bookId, chunks, chunkIndex, isGlossaryOpen);
  const bookmarks = useBookmarks(bookId, chunkIndex);
  const highlights = useHighlights(bookId, chapterIndex);
  const fullscreen = useFullscreen();

  // Page mode: what fits is decided by measurement and reported back from the
  // view. Everything else in the reader still counts in chunks, so a place in
  // the book means the same thing whichever mode found it.
  const isPaged = focusMode === "none";
  const [pageBounds, setPageBounds] = useState<PageBounds>({ next: 0, words: 0 });
  const pageHistoryRef = useRef<PageStep[]>([]);
  const onScreen = useMemo(
    () =>
      isPaged
        ? chunks.slice(chunkIndex, Math.max(chunkIndex + 1, pageBounds.next))
        : chunk
          ? [chunk]
          : [],
    [isPaged, chunks, chunkIndex, pageBounds.next, chunk],
  );

  const goNext = useCallback(() => {
    if (!isPaged) {
      reader.next();
      return;
    }
    const next = Math.max(chunkIndex + 1, pageBounds.next);
    pageHistoryRef.current.push({ from: chunkIndex, to: next });
    reader.goToChunk(next, { isForwardStep: true });
  }, [isPaged, reader, chunkIndex, pageBounds.next]);

  const goPrevious = useCallback(() => {
    if (!isPaged) {
      reader.previous();
      return;
    }
    // The page turned forward from, when there is one — an estimate only when
    // the reader arrived here some other way.
    const remembered = popPageStep(pageHistoryRef.current, chunkIndex);
    reader.goToChunk(remembered ?? previousPageStart(chunks, chunkIndex, pageBounds.words));
  }, [isPaged, reader, chunks, chunkIndex, pageBounds.words]);

  // Not while the "where you were" card is up: the pacer would walk the page
  // behind it and be waiting at the bottom by the time the reader arrived.
  const pacer = useReadingPacer(
    onScreen,
    isPacerEnabled && !reader.isResuming && !reader.isLoading,
    pacerWordsPerMinute,
  );

  const gestures = useReaderGestures({
    onNext: goNext,
    onPrevious: goPrevious,
    onToggleChrome: () => setIsChromeVisible((visible) => !visible),
    onPenSweep: highlights.sweep,
  });
  useWakeLock(!reader.isLoading && !reader.isResuming);

  const progress = bookProgress(chunks, chunkIndex);
  const breakLabel = nextBreakLabel(chunks, chunkIndex, reader.wordsPerMinute);
  const chapterTitle = book?.chapters[chapterIndex]?.title ?? null;
  const timeLeft = formatEstimate(
    minutesFor(wordsRemaining(chunks, chunkIndex), reader.wordsPerMinute),
    reader.wordsPerMinute,
  );

  if (reader.isLoading) return <div className="reader-stage" aria-busy />;

  if (!book || !chunk) {
    return (
      <div className="reader-stage items-center justify-center">
        <p className="text-sm text-content-secondary">
          That book isn&apos;t here.{" "}
          <Link href="/read" className="underline">
            Back to the shelf
          </Link>
        </p>
      </div>
    );
  }

  if (reader.isResuming) {
    return (
      <div className="reader-stage" style={{ fontSize }}>
        <ResumeCard
          bookTitle={book.title}
          chapterTitle={chapterTitle}
          progressPercent={progress}
          previous={chunks[chunkIndex - 1] ?? null}
          onResume={reader.resume}
        />
      </div>
    );
  }

  // Tapping a mark offers to recolour or remove it; anywhere else in the text
  // is a page turn, handled by the gesture layer.
  const handleHighlightClick = (event: React.MouseEvent<HTMLElement>) => {
    const mark = (event.target as HTMLElement).closest("[data-highlight-id]");
    const id = mark?.getAttribute("data-highlight-id");
    if (id) highlights.openExisting(id);
  };

  return (
    <div className="reader-stage" style={{ fontSize }}>
      <header className={cn("reader-topbar", isChromeVisible && "is-visible")}>
        <Link href="/read" aria-label="Back to the shelf" className="reader-icon-link">
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-medium text-content-primary">{book.title}</p>
          <p className="truncate text-xs text-content-tertiary">
            {chapterTitle ? `${chapterTitle} · ` : ""}
            {timeLeft} left
          </p>
        </div>
        <IconButton
          aria-label={bookmarks.current ? "Remove bookmark" : "Bookmark this page"}
          onClick={() => bookmarks.toggle(chunk)}
        >
          <Bookmark
            className={cn("size-5", bookmarks.current && "fill-current text-accent")}
            aria-hidden
          />
        </IconButton>
        <IconButton
          aria-label={isPacerEnabled ? "Turn off the reading pacer" : "Reading pacer"}
          aria-pressed={isPacerEnabled}
          onClick={() => setPacerEnabled(!isPacerEnabled)}
        >
          <Gauge className={cn("size-5", isPacerEnabled && "text-accent")} aria-hidden />
        </IconButton>
        <IconButton aria-label="Contents" onClick={() => setIsContentsOpen(true)}>
          <List className="size-5" aria-hidden />
        </IconButton>
        {/* Absent where it cannot work — an iPhone would only get a button
            that does nothing. */}
        {fullscreen.isSupported && (
          <IconButton
            aria-label={fullscreen.isFullscreen ? "Leave fullscreen" : "Fullscreen"}
            aria-pressed={fullscreen.isFullscreen}
            onClick={fullscreen.toggle}
          >
            {fullscreen.isFullscreen ? (
              <Minimize2 className="size-5" aria-hidden />
            ) : (
              <Maximize2 className="size-5" aria-hidden />
            )}
          </IconButton>
        )}
        <IconButton aria-label="Characters" onClick={() => setIsGlossaryOpen(true)}>
          <Users className="size-5" aria-hidden />
        </IconButton>
        <IconButton aria-label="Reading settings" onClick={() => setIsSettingsOpen(true)}>
          <Settings2 className="size-5" aria-hidden />
        </IconButton>
      </header>

      {/* One surface takes every gesture: taps turn pages, the top band shows
          the chrome, swipes work in any direction, and a selection reaches for
          the highlighter instead of turning the page. */}
      <main className="reader-surface" onClick={handleHighlightClick} {...gestures}>
        {isPaged ? (
          <PageView
            chunks={chunks}
            chunkIndex={chunkIndex}
            highlights={highlights.all}
            activeWord={pacer.activeWord}
            onBounds={setPageBounds}
          />
        ) : focusMode === "step" ? (
          <StepView
            chunk={chunk}
            previous={chunks[chunkIndex - 1] ?? null}
            highlights={highlights.forChapter}
            activeWord={pacer.activeWord}
          />
        ) : (
          <SpotlightView
            chunks={chunks}
            chunkIndex={chunkIndex}
            highlights={highlights.forChapter}
            activeWord={pacer.activeWord}
          />
        )}
      </main>

      {/* Hidden while the highlight bar is up — they share the same corner of
          the screen, and only one of them is being used at a time. */}
      {isPacerEnabled && !highlights.target && <PacerControl pacer={pacer} />}

      <button
        type="button"
        className="reader-footer"
        aria-label="Reading settings"
        onClick={() => setIsSettingsOpen(true)}
      >
        <span className="reader-progress" aria-hidden>
          <span className="reader-progress-fill" style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="flex items-baseline justify-between gap-3 px-1 pt-1.5">
          <span className="truncate text-xs text-content-tertiary">
            {breakLabel ?? "the last of it"}
          </span>
          <span className="shrink-0 text-xs text-content-tertiary tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        </span>
      </button>

      {!hasSeenGestureHint && <GestureHint onDismiss={markGestureHintSeen} />}

      <HighlightPopover highlights={highlights} />
      <ReaderSettingsSheet isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ContentsPanel
        isOpen={isContentsOpen}
        onClose={() => setIsContentsOpen(false)}
        chapterTitles={book.chapters.map((chapter) => chapter.title)}
        chunks={chunks}
        chunkIndex={chunkIndex}
        bookmarks={bookmarks.bookmarks}
        wordsPerMinute={reader.wordsPerMinute}
        onGoToChunk={reader.goToChunk}
        onGoToChapter={reader.goToChapter}
        onRemoveBookmark={bookmarks.remove}
      />
      <CharacterGlossaryPanel
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
        glossary={glossary}
        onGoToChunk={reader.goToChunk}
      />
    </div>
  );
}
