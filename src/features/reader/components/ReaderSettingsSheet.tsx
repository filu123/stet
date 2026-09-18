"use client";

import { Minus, Plus, X } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";
import {
  PACER_WPM_MAX,
  PACER_WPM_MIN,
  PACER_WPM_STEP,
  READER_FONT_SIZES,
  useReaderStore,
  type ReaderFocusMode,
} from "@/stores/reader-store";

import type { ChunkSizeName } from "../lib/chunker";

interface ReaderSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUS_MODES: { value: ReaderFocusMode; label: string; hint: string }[] = [
  { value: "step", label: "Step", hint: "One piece at a time" },
  { value: "spotlight", label: "Spotlight", hint: "The page stays, the light moves" },
  { value: "none", label: "None", hint: "A full page, turned a page at a time" },
];

const CHUNK_SIZES: { value: ChunkSizeName; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

/** A bottom sheet, because on a phone that is where the thumb already is. */
export function ReaderSettingsSheet({ isOpen, onClose }: ReaderSettingsSheetProps) {
  const {
    focusMode,
    chunkSize,
    fontSize,
    pacerWordsPerMinute,
    setFocusMode,
    setChunkSize,
    setFontSize,
    setPacerWordsPerMinute,
  } = useReaderStore();

  if (!isOpen) return null;

  const sizeIndex = READER_FONT_SIZES.indexOf(fontSize as (typeof READER_FONT_SIZES)[number]);
  const stepFont = (direction: 1 | -1) => {
    const next = READER_FONT_SIZES[Math.max(0, Math.min(READER_FONT_SIZES.length - 1, (sizeIndex < 0 ? 2 : sizeIndex) + direction))];
    setFontSize(next);
  };

  return (
    <>
      <div className="reader-scrim" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="Reading settings" className="reader-sheet">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-content-primary">Reading</h2>
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </IconButton>
        </div>

        <fieldset className="mb-5">
          <legend className="reader-sheet-legend">Focus</legend>
          <div className="flex gap-2">
            {FOCUS_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                aria-pressed={focusMode === mode.value}
                onClick={() => setFocusMode(mode.value)}
                className={cn("reader-choice flex-1", focusMode === mode.value && "is-selected")}
              >
                <span className="block font-medium">{mode.label}</span>
                <span className="mt-0.5 block text-xs text-content-tertiary">{mode.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-5">
          <legend className="reader-sheet-legend">How much at once</legend>
          <div className="flex gap-2">
            {CHUNK_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                aria-pressed={chunkSize === size.value}
                onClick={() => setChunkSize(size.value)}
                className={cn("reader-choice flex-1", chunkSize === size.value && "is-selected")}
              >
                {size.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-5">
          <legend className="reader-sheet-legend">Text size</legend>
          <div className="flex items-center gap-3">
            <IconButton
              aria-label="Smaller text"
              onClick={() => stepFont(-1)}
              className="border border-border-subtle"
            >
              <Minus className="size-4" aria-hidden />
            </IconButton>
            <span className="flex-1 text-center text-sm text-content-secondary tabular-nums">
              {fontSize}px
            </span>
            <IconButton
              aria-label="Larger text"
              onClick={() => stepFont(1)}
              className="border border-border-subtle"
            >
              <Plus className="size-4" aria-hidden />
            </IconButton>
          </div>
        </fieldset>

        <fieldset>
          <legend className="reader-sheet-legend">
            Pacer speed
            <span className="float-right tabular-nums">{pacerWordsPerMinute} wpm</span>
          </legend>
          <input
            type="range"
            aria-label="Pacer speed in words per minute"
            min={PACER_WPM_MIN}
            max={PACER_WPM_MAX}
            step={PACER_WPM_STEP}
            value={pacerWordsPerMinute}
            onChange={(event) => setPacerWordsPerMinute(Number(event.target.value))}
            className="book-scrubber w-full"
          />
        </fieldset>
      </div>
    </>
  );
}
