"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { readApiKey } from "@/features/settings";
import { useSettingsStore } from "@/stores/settings-store";

import { buildCharacterIndex } from "../lib/character-index";
import { NOT_A_PERSON, describeCharacters } from "../lib/glossary-service";
import { listCharacterNotes, saveCharacterNotes } from "../lib/reader-repository";
import type { CharacterEntry, ReadingChunk } from "../types";

/** Only the people worth a line; a long tail of one-off names helps nobody. */
const MAX_CHARACTERS = 24;

export interface GlossaryCharacter extends CharacterEntry {
  /** The AI's line, if one has been written and the name survived it. */
  description: string | null;
}

export interface CharacterGlossary {
  characters: GlossaryCharacter[];
  isEnriching: boolean;
  error: string | null;
  /** Asks for a line on each character not yet described. */
  enrich: () => void;
}

/**
 * The cast list, built from the part of the book already read.
 *
 * The local index does the work and needs nothing: names, how often they
 * appear, and the sentence they first appeared in. The AI pass is a garnish —
 * one line each, and a verdict on which "names" were really places.
 */
export function useCharacterGlossary(
  bookId: string | null,
  chunks: ReadingChunk[],
  chunkIndex: number,
  isOpen: boolean,
): CharacterGlossary {
  const settings = useSettingsStore();
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scanning the read half of a novel is not free, so only when it is asked for.
  const entries = useMemo(() => {
    if (!isOpen || chunks.length === 0) return [];
    return buildCharacterIndex(chunks, chunkIndex).slice(0, MAX_CHARACTERS);
  }, [isOpen, chunks, chunkIndex]);

  useEffect(() => {
    if (!bookId || !isOpen) return;
    let isStale = false;
    void listCharacterNotes(bookId).then((stored) => {
      if (isStale) return;
      setNotes(new Map(stored.map((note) => [note.name, note.description])));
    });
    return () => {
      isStale = true;
    };
  }, [bookId, isOpen]);

  const enrich = useCallback(() => {
    if (!bookId || isEnriching) return;
    const apiKey = readApiKey(settings.provider);
    if (!apiKey) {
      setError("Add an API key in Settings to get one-line descriptions.");
      return;
    }
    // Only names without a line yet — re-describing the whole cast on every
    // open would burn the reader's own money for nothing.
    const pending = entries.filter((entry) => !notes.has(entry.name));
    if (pending.length === 0) return;

    setIsEnriching(true);
    setError(null);
    void describeCharacters(pending, settings, apiKey)
      .then(async (descriptions) => {
        setNotes((current) => {
          const merged = new Map(current);
          descriptions.forEach(({ name, description }) => merged.set(name, description));
          return merged;
        });
        await saveCharacterNotes(
          descriptions.map(({ name, description }) => ({
            bookId,
            name,
            description,
            generatedAtChunk: chunkIndex,
          })),
        );
      })
      .catch((thrown: unknown) => {
        setError(thrown instanceof Error ? thrown.message : "Couldn't reach the AI provider.");
      })
      .finally(() => setIsEnriching(false));
  }, [bookId, chunkIndex, entries, isEnriching, notes, settings]);

  const characters = useMemo(
    () =>
      entries
        .map((entry) => ({ ...entry, description: notes.get(entry.name) ?? null }))
        .filter((entry) => entry.description !== NOT_A_PERSON),
    [entries, notes],
  );

  return { characters, isEnriching, error, enrich };
}
