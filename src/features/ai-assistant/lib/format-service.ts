import type { Editor } from "@tiptap/core";

import type { AiSettings } from "@/types/ai";

import { buildDocumentTextIndex, resolveQuoteRange } from "./position-mapper";
import { requestCompletion } from "./provider-client";
import { extractJsonArray } from "./suggestion-parser";

/**
 * AI document formatting: the model returns quote-anchored formatting
 * instructions, we resolve them to positions and apply REAL marks (unlike
 * review decorations) in one undoable transaction chain.
 */

export interface FormatStyle {
  id: string;
  label: string;
  description: string;
  instruction: string;
}

export const FORMAT_STYLES: readonly FormatStyle[] = [
  {
    id: "pretty",
    label: "Make it pretty",
    description: "Colorful highlights, underlines and circles",
    instruction:
      "Make the document visually delightful and scannable: highlight the most important phrases in varied colors, underline memorable lines, circle key terms and numbers. Use color variety tastefully.",
  },
  {
    id: "book",
    label: "Book style",
    description: "Headings, emphasis, elegant structure",
    instruction:
      "Format like a well-edited book: turn short standalone lines that act as titles into headings, italicize emphasis and foreign phrases, bold a handful of truly important terms. Be restrained — no highlights or circles unless something is exceptional.",
  },
  {
    id: "study",
    label: "Study notes",
    description: "Highlight facts, circle terms to remember",
    instruction:
      "Format for studying: highlight key facts and definitions in yellow, circle terms and names worth memorizing, underline cause-effect statements in green. Prioritize recall value.",
  },
  {
    id: "takeaways",
    label: "Key takeaways",
    description: "Surface the main points",
    instruction:
      "Surface only the essential: highlight the 3-7 sentences that carry the core message in green, bold the single most important conclusion. Leave everything else untouched.",
  },
];

const FORMAT_SYSTEM_PROMPT = `You are a document formatter. Given a document and a formatting style, reply with a JSON array of formatting instructions.

Each item: {"action": "<action>", "quote": "<exact text from the document>", "occurrence": 1, "color": "<color>"}

Actions: "highlight", "underline", "circle", "bold", "italic", "heading".
- "color" is required for highlight/underline/circle and must be one of: "yellow", "green", "blue", "purple", "red". Omit it for bold/italic/heading.
- "heading" turns the paragraph containing the quote into a heading — use it only when the quote is the FULL text of a short title-like line.

Hard rules:
- "quote" MUST be copied character-for-character from the document (same casing, punctuation, spacing) and must not cross a paragraph boundary.
- "occurrence" is the 1-based index of which occurrence of that exact text you mean.
- Return at most 25 items. Do not format everything — restraint reads better.
- Output the JSON array ONLY — no markdown fences, no commentary.`;

interface FormatInstruction {
  action: "highlight" | "underline" | "circle" | "bold" | "italic" | "heading";
  quote: string;
  occurrence: number;
  color?: string;
}

const HIGHLIGHT_COLOR_VARS: Record<string, string> = {
  yellow: "var(--pill-yellow-bg)",
  green: "var(--pill-green-bg)",
  blue: "var(--pill-blue-bg)",
  purple: "var(--pill-purple-bg)",
  red: "var(--pill-red-bg)",
};

const STROKE_COLOR_VARS: Record<string, string> = {
  yellow: "var(--mark-amber)",
  green: "var(--mark-green)",
  blue: "var(--mark-blue)",
  purple: "var(--mark-purple)",
  red: "var(--mark-red)",
};

const VALID_ACTIONS = ["highlight", "underline", "circle", "bold", "italic", "heading"] as const;

/** Runs the format request and applies the result. Returns how many instructions were applied. */
export async function formatDocument(
  editor: Editor,
  style: FormatStyle,
  settings: AiSettings,
  apiKey: string,
): Promise<number> {
  const textIndex = buildDocumentTextIndex(editor.state.doc);
  const modelOutput = await requestCompletion({
    systemPrompt: FORMAT_SYSTEM_PROMPT,
    userPrompt: `Style: ${style.label}. ${style.instruction}\n\nFormat this document:\n\n<document>\n${textIndex.text}\n</document>`,
    settings,
    apiKey,
  });

  const instructions = parseFormatInstructions(modelOutput);

  // Resolve every quote BEFORE applying — marks don't shift positions, and a
  // paragraph→heading swap keeps node sizes, so all ranges stay valid.
  const resolved = instructions.flatMap((instruction) => {
    const range = resolveQuoteRange(textIndex, instruction.quote, instruction.occurrence);
    return range ? [{ instruction, range }] : [];
  });
  if (resolved.length === 0) return 0;

  const { from: originalFrom, to: originalTo } = editor.state.selection;
  let chain = editor.chain().focus();
  for (const { instruction, range } of resolved) {
    chain = chain.setTextSelection(range);
    switch (instruction.action) {
      case "highlight":
        chain = chain.setMark("highlight", {
          color: HIGHLIGHT_COLOR_VARS[instruction.color ?? "yellow"] ?? HIGHLIGHT_COLOR_VARS.yellow,
        });
        break;
      case "underline":
        chain = chain.setMark("underline", {
          color: STROKE_COLOR_VARS[instruction.color ?? "blue"] ?? STROKE_COLOR_VARS.blue,
        });
        break;
      case "circle":
        chain = chain.setMark("circle", {
          color: STROKE_COLOR_VARS[instruction.color ?? "blue"] ?? STROKE_COLOR_VARS.blue,
        });
        break;
      case "bold":
        chain = chain.setMark("bold");
        break;
      case "italic":
        chain = chain.setMark("italic");
        break;
      case "heading":
        chain = chain.setNode("heading", { level: 2 });
        break;
    }
  }
  chain.setTextSelection({ from: originalFrom, to: originalTo }).run(); // one undo step

  return resolved.length;
}

function parseFormatInstructions(modelOutput: string): FormatInstruction[] {
  const jsonText = extractJsonArray(modelOutput);
  if (jsonText === null) {
    throw new Error("The AI response could not be read. Try formatting again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("The AI response could not be read. Try formatting again.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("The AI response could not be read. Try formatting again.");
  }

  return parsed.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const candidate = entry as Record<string, unknown>;
    const action = candidate.action;
    const quote = candidate.quote;
    if (
      typeof action !== "string" ||
      !VALID_ACTIONS.includes(action as FormatInstruction["action"]) ||
      typeof quote !== "string" ||
      quote.trim().length === 0
    ) {
      return [];
    }
    return [
      {
        action: action as FormatInstruction["action"],
        quote,
        occurrence:
          typeof candidate.occurrence === "number" && candidate.occurrence >= 1
            ? Math.floor(candidate.occurrence)
            : 1,
        ...(typeof candidate.color === "string" ? { color: candidate.color } : {}),
      },
    ];
  });
}
