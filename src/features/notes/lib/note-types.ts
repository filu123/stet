/**
 * Notes = Google-Docs-style comments anchored to a text range. The anchor is a
 * `note` TipTap mark whose attributes carry the whole thread, so notes live
 * inside the document JSON and persist with it — no separate storage.
 */

export interface NoteMessage {
  id: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface Note {
  id: string;
  /** The text the note was attached to, kept for display. */
  quote: string;
  createdAt: string;
  /** `[0]` is the original comment; the rest are replies. */
  messages: NoteMessage[];
}

/** A note plus the live document range of its anchor (resolved from the mark). */
export interface AnchoredNote extends Note {
  from: number;
  to: number;
}
