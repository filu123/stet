import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * Cost control for proactive mode: every reviewed paragraph is remembered by
 * content hash, so only paragraphs the user actually changed are ever sent.
 */

/** Paragraphs shorter than this aren't worth an API call. */
const MIN_PARAGRAPH_LENGTH = 20;

/** djb2 — cheap, stable, good enough for change detection (not security). */
export function hashParagraphText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return `${hash.toString(36)}:${text.length}`;
}

export interface ChangedParagraph {
  text: string;
  hash: string;
}

/** Textblocks whose content hash isn't in `reviewedHashes` (i.e. new or edited). */
export function collectChangedParagraphs(
  doc: ProseMirrorNode,
  reviewedHashes: ReadonlySet<string>,
): ChangedParagraph[] {
  const changed: ChangedParagraph[] = [];
  const seenThisPass = new Set<string>();

  doc.descendants((node) => {
    if (!node.isTextblock) return true;
    const text = node.textContent;
    if (text.trim().length < MIN_PARAGRAPH_LENGTH) return false;

    const hash = hashParagraphText(text);
    if (!reviewedHashes.has(hash) && !seenThisPass.has(hash)) {
      seenThisPass.add(hash);
      changed.push({ text, hash });
    }
    return false; // textblocks don't nest further
  });

  return changed;
}
