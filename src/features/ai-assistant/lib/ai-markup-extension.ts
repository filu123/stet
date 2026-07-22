import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { useAiReviewStore } from "@/stores/ai-review-store";
import type { Suggestion } from "@/types/ai";

/**
 * Renders AI suggestions as ProseMirror DECORATIONS — visual layers that never
 * touch the document content (AGENTS.md law). The plugin owns the live ranges:
 * decorations are remapped through every transaction, so they stay anchored to
 * their text while the user types.
 *
 * Lives in the ai-assistant feature (not editor/extensions) to keep the
 * dependency graph acyclic: editor → ai-assistant, never both ways.
 */

export const aiMarkupPluginKey = new PluginKey<DecorationSet>("aiMarkup");

type AiMarkupMeta =
  | { type: "set"; suggestions: Suggestion[] }
  | { type: "add"; suggestion: Suggestion }
  | { type: "remove"; suggestionId: string }
  | { type: "clear" };

export const AiMarkupExtension = Extension.create({
  name: "aiMarkup",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: aiMarkupPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, decorations) {
            const meta = tr.getMeta(aiMarkupPluginKey) as AiMarkupMeta | undefined;
            if (meta?.type === "set") return createDecorationSet(tr.doc, meta.suggestions);
            if (meta?.type === "add") {
              return decorations.add(tr.doc, buildDecorations(tr.doc, [meta.suggestion]));
            }
            if (meta?.type === "remove") {
              return decorations.remove(
                decorations.find(
                  undefined,
                  undefined,
                  (spec) => spec.suggestionId === meta.suggestionId,
                ),
              );
            }
            if (meta?.type === "clear") return DecorationSet.empty;
            // No meta: keep decorations anchored through the edit.
            return decorations.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return aiMarkupPluginKey.getState(state);
          },
          handleClick(view, pos) {
            const decorations = aiMarkupPluginKey.getState(view.state);
            const hit = decorations?.find(pos, pos)[0];
            useAiReviewStore
              .getState()
              .setActiveSuggestion(hit ? (hit.spec.suggestionId as string) : null);
            return false;
          },
        },
      }),
    ];
  },
});

function createDecorationSet(doc: ProseMirrorNode, suggestions: Suggestion[]): DecorationSet {
  return DecorationSet.create(doc, buildDecorations(doc, suggestions));
}

function buildDecorations(doc: ProseMirrorNode, suggestions: Suggestion[]): Decoration[] {
  return suggestions
    .filter((s) => s.from < s.to && s.to <= doc.content.size)
    .map((s) =>
      Decoration.inline(
        s.from,
        s.to,
        { class: `ai-markup ai-markup-${s.kind}`, "data-suggestion-id": s.id },
        { suggestionId: s.id, kind: s.kind },
      ),
    );
}

/* --- Imperative helpers used by the AI components --------------------------- */

export function showAiMarkup(editor: Editor, suggestions: Suggestion[]): void {
  dispatchAiMarkupMeta(editor, { type: "set", suggestions });
}

export function addAiMarkup(editor: Editor, suggestion: Suggestion): void {
  dispatchAiMarkupMeta(editor, { type: "add", suggestion });
}

export function removeAiMarkup(editor: Editor, suggestionId: string): void {
  dispatchAiMarkupMeta(editor, { type: "remove", suggestionId });
}

export function clearAiMarkup(editor: Editor): void {
  dispatchAiMarkupMeta(editor, { type: "clear" });
}

/** The suggestion's CURRENT range (remapped through all edits since review). */
export function findAiMarkupRange(
  editor: Editor,
  suggestionId: string,
): { from: number; to: number } | null {
  const decorations = aiMarkupPluginKey.getState(editor.state);
  const hit = decorations?.find(
    undefined,
    undefined,
    (spec) => spec.suggestionId === suggestionId,
  )[0];
  return hit ? { from: hit.from, to: hit.to } : null;
}

function dispatchAiMarkupMeta(editor: Editor, meta: AiMarkupMeta): void {
  editor.view.dispatch(editor.state.tr.setMeta(aiMarkupPluginKey, meta));
}
