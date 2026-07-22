import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import type { Extensions } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";

import { AiMarkupExtension } from "@/features/ai-assistant";

import { CircleMark } from "../extensions/circle-mark";
import { ColoredUnderline } from "../extensions/colored-underline";

/**
 * The single source of truth for the editor's schema.
 * Used by the live editor AND by Markdown conversion — they must never diverge.
 * (AiMarkupExtension adds decorations only — no schema impact.)
 */
export function buildEditorExtensions(): Extensions {
  return [
    // ColoredUnderline replaces StarterKit's plain underline
    StarterKit.configure({ underline: false }),
    ColoredUnderline,
    Highlight.configure({ multicolor: true }),
    CircleMark,
    Placeholder.configure({ placeholder: "Start writing…" }),
    AiMarkupExtension,
  ];
}
