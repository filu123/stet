import { generateJSON, getSchema } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { marked } from "marked";
import { defaultMarkdownSerializer, MarkdownSerializer } from "prosemirror-markdown";

import type { TipTapJsonContent } from "@/types/document";

import { buildEditorExtensions } from "./editor-extensions";

/**
 * TipTap JSON ↔ Markdown conversion.
 * TipTap JSON stays the canonical format — Markdown is an exchange format only
 * (highlight colors and underline don't survive the trip; that's accepted).
 */

const schema = getSchema(buildEditorExtensions());

// prosemirror-markdown's default serializer uses snake_case node names;
// ours are TipTap's camelCase — map them explicitly.
const markdownSerializer = new MarkdownSerializer(
  {
    paragraph: defaultMarkdownSerializer.nodes.paragraph,
    heading: defaultMarkdownSerializer.nodes.heading,
    blockquote: defaultMarkdownSerializer.nodes.blockquote,
    bulletList: defaultMarkdownSerializer.nodes.bullet_list,
    orderedList: defaultMarkdownSerializer.nodes.ordered_list,
    listItem: defaultMarkdownSerializer.nodes.list_item,
    horizontalRule: defaultMarkdownSerializer.nodes.horizontal_rule,
    hardBreak: defaultMarkdownSerializer.nodes.hard_break,
    text: defaultMarkdownSerializer.nodes.text,
    codeBlock: (state, node) => {
      state.write(`\`\`\`${node.attrs.language ?? ""}\n`);
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write("```");
      state.closeBlock(node);
    },
    // No Markdown syntax for page breaks — an HTML comment survives round trips
    // through most tools without rendering.
    pageBreak: (state, node) => {
      state.write("<!-- page-break -->");
      state.closeBlock(node);
    },
  },
  {
    bold: defaultMarkdownSerializer.marks.strong,
    italic: defaultMarkdownSerializer.marks.em,
    code: defaultMarkdownSerializer.marks.code,
    link: defaultMarkdownSerializer.marks.link,
    strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
    // Markdown has no highlight/underline/circle syntax — these pass through unformatted.
    highlight: { open: "==", close: "==", mixable: true, expelEnclosingWhitespace: true },
    underline: { open: "", close: "", mixable: true },
    circle: { open: "", close: "", mixable: true },
  },
);

export function documentContentToMarkdown(content: TipTapJsonContent | null): string {
  if (!content) return "";
  const documentNode = ProseMirrorNode.fromJSON(schema, content);
  return markdownSerializer.serialize(documentNode);
}

export function markdownToDocumentContent(markdown: string): TipTapJsonContent {
  return htmlToDocumentContent(marked.parse(markdown, { async: false }));
}

/** Any HTML → TipTap JSON through the editor's own schema (import pipeline core). */
export function htmlToDocumentContent(html: string): TipTapJsonContent {
  return generateJSON(html, buildEditorExtensions());
}
