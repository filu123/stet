import {
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  UnderlineType,
} from "docx";

import type { EditorDocument } from "@/types/document";

/**
 * TipTap JSON → .docx. Loaded dynamically by export-service.
 * Faithful for the common structure (headings, lists, quotes, code, breaks,
 * bold/italic/underline/strike/highlight); circles have no Word equivalent
 * and export as plain text.
 */

type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

/** Word's highlight palette is fixed — map our pill tokens onto it. */
const HIGHLIGHT_NAMES = {
  "var(--pill-yellow-bg)": "yellow",
  "var(--pill-green-bg)": "green",
  "var(--pill-blue-bg)": "cyan",
  "var(--pill-purple-bg)": "magenta",
  "var(--pill-red-bg)": "red",
} as const satisfies Record<string, "yellow" | "green" | "cyan" | "magenta" | "red">;

type HighlightColor = (typeof HIGHLIGHT_NAMES)[keyof typeof HIGHLIGHT_NAMES];

const UNDERLINE_HEX: Record<string, string> = {
  "var(--mark-red)": "E0453A",
  "var(--mark-amber)": "B98A00",
  "var(--mark-blue)": "0A7CFF",
  "var(--mark-green)": "1F9E54",
  "var(--mark-purple)": "7C4DFF",
};

export async function buildDocxBlob(editorDocument: EditorDocument): Promise<Blob> {
  const paragraphs: Paragraph[] = [
    new Paragraph({ text: editorDocument.title, heading: HeadingLevel.TITLE }),
    ...convertBlocks((editorDocument.content as JsonNode | null)?.content ?? []),
  ];

  const document = new Document({
    numbering: {
      config: [
        {
          reference: "stet-numbered",
          levels: [{ level: 0, format: "decimal", text: "%1." }],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(document);
}

function convertBlocks(nodes: JsonNode[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "paragraph":
        paragraphs.push(new Paragraph({ children: convertInline(node) }));
        break;
      case "heading": {
        const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
        paragraphs.push(
          new Paragraph({ children: convertInline(node), heading: HEADING_LEVELS[level - 1] }),
        );
        break;
      }
      case "bulletList":
      case "orderedList":
        for (const listItem of node.content ?? []) {
          for (const child of listItem.content ?? []) {
            paragraphs.push(
              new Paragraph({
                children: convertInline(child),
                ...(node.type === "bulletList"
                  ? { bullet: { level: 0 } }
                  : { numbering: { reference: "stet-numbered", level: 0 } }),
              }),
            );
          }
        }
        break;
      case "blockquote":
        for (const child of node.content ?? []) {
          paragraphs.push(
            new Paragraph({
              children: convertInline(child, { italics: true }),
              indent: { left: 480 },
            }),
          );
        }
        break;
      case "codeBlock":
        paragraphs.push(
          new Paragraph({
            children: (node.content?.[0]?.text ?? "").split("\n").map(
              (line, index) =>
                new TextRun({ text: line, font: "Courier New", break: index > 0 ? 1 : 0 }),
            ),
          }),
        );
        break;
      case "horizontalRule":
        paragraphs.push(new Paragraph({ thematicBreak: true }));
        break;
      case "pageBreak":
        paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      default:
        if (node.content) paragraphs.push(...convertBlocks(node.content));
    }
  }
  return paragraphs;
}

function convertInline(node: JsonNode, inherited: { italics?: boolean } = {}): TextRun[] {
  const runs: TextRun[] = [];
  for (const child of node.content ?? []) {
    if (child.type !== "text" || !child.text) continue;
    const marks = child.marks ?? [];
    const has = (type: string) => marks.some((mark) => mark.type === type);
    const markAttr = (type: string, attr: string) =>
      marks.find((mark) => mark.type === type)?.attrs?.[attr] as string | undefined;

    const highlightToken = markAttr("highlight", "color") ?? "";
    const underlineToken = markAttr("underline", "color") ?? "";

    runs.push(
      new TextRun({
        text: child.text,
        bold: has("bold"),
        italics: has("italic") || inherited.italics,
        strike: has("strike"),
        font: has("code") ? "Courier New" : undefined,
        highlight: has("highlight")
          ? ((HIGHLIGHT_NAMES as Record<string, HighlightColor>)[highlightToken] ?? "yellow")
          : undefined,
        underline: has("underline")
          ? { type: UnderlineType.SINGLE, color: UNDERLINE_HEX[underlineToken] }
          : undefined,
      }),
    );
  }
  return runs;
}
