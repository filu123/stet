/**
 * Shared types for the reader — a separate feature from the document editor,
 * with its own storage. Books are read, never edited: nothing here carries a
 * ProseMirror document, and annotations (when they arrive) will live beside a
 * book rather than inside it.
 */

/**
 * A piece of inline formatting.
 *
 * Only emphasis, because in fiction that is the formatting that carries
 * meaning — a thought, a stressed word, a ship's name, a foreign phrase.
 * Flattening it loses the sentence's tone.
 */
export interface TextRun {
  text: string;
  emphasis?: boolean;
  strong?: boolean;
  /** A highlight's colour, painted under the run. */
  highlight?: string;
  /** Which highlight, so tapping it can offer to remove it. */
  highlightId?: string;
  /** The word the pacer's light is resting on. */
  isPaced?: boolean;
}

/**
 * A block as the chunker emits it: the same text, plus where it came from in
 * the parsed book. That origin is what lets a highlight survive the reader
 * changing how much text they see at once.
 */
export interface ChunkBlock extends BookBlock {
  /** Index of the source block within its chapter. */
  blockIndex: number;
  /** Character offset into that source block, for a paragraph that was split. */
  blockOffset: number;
}

/** One rendered element of a book. Fiction needs surprisingly few kinds. */
export interface BookBlock {
  kind: "paragraph" | "heading" | "sceneBreak" | "quote";
  /**
   * The plain text. Everything that counts, indexes or searches reads this,
   * so formatting can never change a word count or hide a character's name.
   */
  text: string;
  /** Present only when the source had formatting. Rendering reads this. */
  runs?: TextRun[];
}

export interface BookChapter {
  /** `null` for front matter that arrives before the first heading. */
  title: string | null;
  blocks: BookBlock[];
}

/** A book as parsed, before it is given an id and stored. */
export interface ParsedBook {
  title: string;
  author: string | null;
  chapters: BookChapter[];
  wordCount: number;
}

export interface ReaderBook extends ParsedBook {
  id: string;
  addedAt: number;
  /** Where the text came from, shown in the library. */
  source: "text-file" | "pasted" | "document";
}

/**
 * What the reader advances through: a handful of blocks sized to one screen
 * and one comfortable breath of reading.
 */
export interface ReadingChunk {
  index: number;
  chapterIndex: number;
  blocks: ChunkBlock[];
  wordCount: number;
  /** Words in the book up to (not including) this chunk — drives progress. */
  wordsBefore: number;
  startsChapter: boolean;
  endsChapter: boolean;
  /** The last chunk of a scene: the natural place to stop for the night. */
  endsScene: boolean;
  /**
   * A manufactured stopping point, inserted when the author left no scene
   * break for thousands of words. Without these the promise of a near finish
   * line becomes "31 minutes to the end of this chapter", which is no promise
   * at all.
   */
  isRestPoint: boolean;
  /** This chunk cut a paragraph in half, so it is no place to stop. */
  continuesParagraph: boolean;
}

export interface ReadingProgress {
  bookId: string;
  chunkIndex: number;
  /** The furthest point reached, so going back never loses your place. */
  furthestChunkIndex: number;
  /**
   * How far through, 0–1. Stored rather than derived so the shelf never has to
   * re-chunk a 160,000-word novel per row just to draw a progress bar.
   */
  percent: number;
  /** Exponential moving average of the reader's real pace. */
  wordsPerMinute: number | null;
  wordsRead: number;
  msRead: number;
  updatedAt: number;
}

/** One character as the local index knows them — no AI required. */
export interface CharacterEntry {
  name: string;
  mentions: number;
  firstChunkIndex: number;
  firstChapterIndex: number;
  /** The sentence they first appear in — usually says who they are. */
  firstSentence: string;
  /** Sentences the AI pass is allowed to read. Already-read text only. */
  evidence: string[];
}

/** A place the reader chose to keep. */
export interface Bookmark {
  id: string;
  bookId: string;
  chunkIndex: number;
  chapterIndex: number;
  /** The first words of the marked page, so the list is readable. */
  excerpt: string;
  createdAt: number;
}

/**
 * A highlighted passage.
 *
 * Anchored to the *parsed* book — chapter, block, character offsets — never to
 * a chunk index, because chunk indices move the moment the reader changes how
 * much text they want at once. The quoted text rides along so a highlight can
 * still be found if the book is ever re-imported.
 */
export interface BookHighlight {
  id: string;
  bookId: string;
  chapterIndex: number;
  blockIndex: number;
  start: number;
  end: number;
  text: string;
  color: string;
  createdAt: number;
}

/** An AI one-liner for a character, cached per book. */
export interface CharacterNote {
  bookId: string;
  name: string;
  description: string;
  /** How far the reader had got when this was written — spoiler watermark. */
  generatedAtChunk: number;
}
