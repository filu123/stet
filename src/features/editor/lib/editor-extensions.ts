import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import type { Extensions } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";

import { AiMarkupExtension } from "@/features/ai-assistant";
import { NoteMark } from "@/features/notes";

import { CircleMark } from "../extensions/circle-mark";
import { ColoredUnderline } from "../extensions/colored-underline";
import { PageBreak } from "../extensions/page-break";
import { PageViewExtension } from "../extensions/page-view";

/**
 * The single source of truth for the editor's schema.
 * Used by the live editor AND by Markdown conversion — they must never diverge.
 * (AiMarkupExtension adds decorations only — no schema impact.)
 */
export function buildEditorExtensions(): Extensions {
  return [
    // ColoredUnderline replaces StarterKit's plain underline.
    // Links come from StarterKit; don't follow them on click while editing.
    StarterKit.configure({
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
    }),
    ColoredUnderline,
    Highlight.configure({ multicolor: true }),
    // allowBase64 so browser-storage mode can embed images as data URLs.
    Image.configure({ allowBase64: true, HTMLAttributes: { class: "doc-image" } }),
    CircleMark,
    NoteMark,
    PageBreak,
    PageViewExtension,
    Placeholder.configure({ placeholder: "Start writing…" }),
    AiMarkupExtension,
  ];
}
