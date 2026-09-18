import type { CharacterEntry, ReadingChunk } from "../types";

import { NAME_TITLES, splitIntoSentences } from "./text";

/**
 * Who is this person again?
 *
 * The question that ends long novels for readers who put them down for a week.
 * This builds the answer locally, from the text alone — no API key, no network,
 * instant — and, critically, only from the part of the book already read, so a
 * glossary can never spoil what is coming.
 *
 * It is a heuristic, not a parser: capitalisation plus repetition. Places and
 * ships will slip in. The optional AI pass reads the evidence collected here
 * and quietly drops whatever is not a person.
 */

/** Capitalised words that are almost never a character. */
const NOT_NAMES = new Set([
  "i",
  "the",
  "a",
  "an",
  "and",
  "but",
  "or",
  "so",
  "then",
  "there",
  "here",
  "this",
  "that",
  "these",
  "those",
  "he",
  "she",
  "it",
  "we",
  "they",
  "you",
  "his",
  "her",
  "their",
  "my",
  "our",
  "your",
  "when",
  "where",
  "what",
  "why",
  "how",
  "who",
  "if",
  "as",
  "at",
  "in",
  "on",
  "of",
  "to",
  "for",
  "from",
  "with",
  "by",
  "no",
  "not",
  "yes",
  "oh",
  "ah",
  "well",
  "now",
  "god",
  "heaven",
  "chapter",
  "part",
  "book",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

const TITLES = new Set<string>(NAME_TITLES);

/** How many sentences of evidence to keep per character for the AI pass. */
const MAX_EVIDENCE = 3;
const MAX_EVIDENCE_CHARS = 320;

interface Candidate {
  name: string;
  mentions: number;
  /** Seen somewhere other than the first word of a sentence. */
  isConfirmed: boolean;
  firstChunkIndex: number;
  firstChapterIndex: number;
  evidence: string[];
}

/** Characters met so far, most-mentioned first. */
export function buildCharacterIndex(
  chunks: ReadingChunk[],
  uptoChunkIndex: number,
): CharacterEntry[] {
  const candidates = new Map<string, Candidate>();
  const upto = Math.min(uptoChunkIndex, chunks.length - 1);

  for (let index = 0; index <= upto; index++) {
    const chunk = chunks[index];
    for (const block of chunk.blocks) {
      if (block.kind !== "paragraph") continue;
      for (const sentence of splitIntoSentences(block.text)) {
        for (const found of findNames(sentence)) {
          record(candidates, found, sentence, chunk);
        }
      }
    }
  }

  return [...candidates.values()]
    // A word that only ever opens a sentence is probably just a capital letter.
    .filter((candidate) => candidate.isConfirmed && candidate.mentions >= 2)
    .sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name))
    .map((candidate) => ({
      name: candidate.name,
      mentions: candidate.mentions,
      firstChunkIndex: candidate.firstChunkIndex,
      firstChapterIndex: candidate.firstChapterIndex,
      firstSentence: candidate.evidence[0] ?? "",
      evidence: candidate.evidence,
    }));
}

interface FoundName {
  name: string;
  /** Opened the sentence, so its capital letter proves nothing on its own. */
  isSentenceInitial: boolean;
}

/** Runs of capitalised words, with the titles in front of them stripped. */
function findNames(sentence: string): FoundName[] {
  const tokens = sentence.split(/\s+/);
  const found: FoundName[] = [];

  for (let index = 0; index < tokens.length; index++) {
    const word = cleanToken(tokens[index]);
    if (!isNameWord(word)) continue;

    // "Mr. Harker" — the title is the strongest signal there is, and it means
    // the name after it is a name even at the start of a sentence.
    const previous = index > 0 ? cleanToken(tokens[index - 1]).toLowerCase() : null;
    const hasTitle = previous !== null && TITLES.has(previous);

    const parts = [word];
    let cursor = index + 1;
    while (cursor < tokens.length && isNameWord(cleanToken(tokens[cursor]))) {
      parts.push(cleanToken(tokens[cursor]));
      cursor++;
    }

    const isSentenceInitial = index === 0 && !hasTitle && parts.length === 1;
    found.push({ name: parts.join(" "), isSentenceInitial });
    index = cursor - 1;
  }

  return found;
}

/** Strips quotes, punctuation and the possessive so "Harker's," is "Harker". */
function cleanToken(token: string): string {
  return token
    .replace(/^[^\p{L}]+/u, "")
    .replace(/[^\p{L}]+$/u, "")
    .replace(/[’']s$/u, "");
}

function isNameWord(word: string): boolean {
  if (word.length < 2) return false;
  if (NOT_NAMES.has(word.toLowerCase())) return false;
  if (TITLES.has(word.toLowerCase())) return false;
  // Shouted words and headings are upper case throughout; names are not.
  if (word === word.toUpperCase()) return false;
  return /^\p{Lu}\p{L}+$/u.test(word);
}

function record(
  candidates: Map<string, Candidate>,
  found: FoundName,
  sentence: string,
  chunk: ReadingChunk,
): void {
  const existing = candidates.get(found.name);
  if (!existing) {
    candidates.set(found.name, {
      name: found.name,
      mentions: 1,
      isConfirmed: !found.isSentenceInitial,
      firstChunkIndex: chunk.index,
      firstChapterIndex: chunk.chapterIndex,
      evidence: [trimEvidence(sentence)],
    });
    return;
  }
  existing.mentions += 1;
  if (!found.isSentenceInitial) existing.isConfirmed = true;
  if (existing.evidence.length < MAX_EVIDENCE) {
    const trimmed = trimEvidence(sentence);
    if (!existing.evidence.includes(trimmed)) existing.evidence.push(trimmed);
  }
}

function trimEvidence(sentence: string): string {
  const collapsed = sentence.replace(/\s+/g, " ").trim();
  return collapsed.length <= MAX_EVIDENCE_CHARS
    ? collapsed
    : `${collapsed.slice(0, MAX_EVIDENCE_CHARS)}…`;
}
