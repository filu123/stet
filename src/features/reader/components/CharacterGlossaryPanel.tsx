"use client";

import { Sparkles, X } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";

import type { CharacterGlossary } from "../hooks/useCharacterGlossary";

interface CharacterGlossaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  glossary: CharacterGlossary;
  onGoToChunk: (index: number) => void;
}

/**
 * Who's who, from the part of the book you have read.
 *
 * Everything here is built locally and instantly: the name, how often it has
 * appeared, and the sentence it first appeared in — which in a novel almost
 * always says who the person is. The AI line is optional garnish, and neither
 * half is ever shown a page the reader has not reached.
 */
export function CharacterGlossaryPanel({
  isOpen,
  onClose,
  glossary,
  onGoToChunk,
}: CharacterGlossaryPanelProps) {
  if (!isOpen) return null;
  const { characters, isEnriching, error, enrich } = glossary;
  const hasUndescribed = characters.some((character) => !character.description);

  return (
    <>
      <div className="reader-scrim" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label="Characters" className="reader-panel">
        <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div>
            <h2 className="text-sm font-medium text-content-primary">Characters</h2>
            <p className="text-xs text-content-tertiary">Only from what you&apos;ve read</p>
          </div>
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {characters.length === 0 && (
            <p className="py-8 text-center text-sm text-content-tertiary">
              No one has been named twice yet.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {characters.map((character) => (
              <li key={character.name}>
                <button
                  type="button"
                  onClick={() => {
                    onGoToChunk(character.firstChunkIndex);
                    onClose();
                  }}
                  className="reader-character"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-content-primary">{character.name}</span>
                    <span className="shrink-0 text-xs text-content-tertiary tabular-nums">
                      {character.mentions}×
                    </span>
                  </span>
                  {character.description ? (
                    <span className="mt-1 block text-sm text-content-secondary">
                      {character.description}
                    </span>
                  ) : (
                    <span className="reader-character-quote">“{character.firstSentence}”</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {error && <p className="mt-4 text-xs text-danger">{error}</p>}
        </div>

        {hasUndescribed && (
          <footer className="border-t border-border-subtle px-4 py-3">
            <button
              type="button"
              disabled={isEnriching}
              onClick={enrich}
              className="reader-enrich-button"
            >
              <Sparkles className="size-4" aria-hidden />
              {isEnriching ? "Reading your notes…" : "Describe them in a line"}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
