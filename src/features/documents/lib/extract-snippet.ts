import type { TipTapJsonContent } from "@/types/document";

/**
 * The opening readable text of a document, for card previews. Walks block by
 * block and stops early once it has enough — cheap even for very long docs.
 */
export function extractSnippet(content: TipTapJsonContent | null, maxChars = 180): string {
  if (!content?.content) return "";

  const blocks: string[] = [];
  let total = 0;

  for (const block of content.content) {
    let text = "";
    const gather = (node: TipTapJsonContent) => {
      if (typeof node.text === "string") text += node.text;
      node.content?.forEach(gather);
    };
    gather(block);

    const trimmed = text.trim();
    if (trimmed) {
      blocks.push(trimmed);
      total += trimmed.length;
      if (total >= maxChars) break;
    }
  }

  const joined = blocks.join("  ");
  return joined.length > maxChars ? `${joined.slice(0, maxChars).trimEnd()}…` : joined;
}
