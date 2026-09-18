import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import { buildEditorExtensions } from "../lib/editor-extensions";

import { buildStrokeTransaction, type PenStroke } from "./pen-markup";

const schema = getSchema(buildEditorExtensions());
const YELLOW = "var(--pill-yellow-bg)";
const GREEN = "var(--pill-green-bg)";

/** "Hello world" in one paragraph — text runs from position 1 to 12. */
function stateWithText(text = "Hello world"): EditorState {
  return EditorState.create({
    schema,
    doc: schema.nodeFromJSON({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    }),
  });
}

function stroke(overrides: Partial<PenStroke> = {}): PenStroke {
  return { anchorPos: 1, headPos: 6, mode: "apply", color: YELLOW, ...overrides };
}

/** Colors of the highlight marks covering each character, in order. */
function highlightColors(state: EditorState, doc = state.doc): (string | null)[] {
  const colors: (string | null)[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const mark = node.marks.find((candidate) => candidate.type.name === "highlight");
    for (let index = 0; index < node.nodeSize; index += 1) {
      colors[pos + index - 1] = mark ? (mark.attrs.color as string) : null;
    }
    return true;
  });
  return colors;
}

describe("buildStrokeTransaction", () => {
  it("highlights the swept range in the pen's color", () => {
    const state = stateWithText();
    const { transaction, wasTap } = buildStrokeTransaction(state, stroke());

    expect(wasTap).toBe(false);
    const colors = highlightColors(state, transaction.doc);
    // "Hello" swept (1→6); the space and "world" untouched.
    expect(colors.slice(0, 5)).toEqual([YELLOW, YELLOW, YELLOW, YELLOW, YELLOW]);
    expect(colors[5]).toBeNull();
  });

  it("sweeps right-to-left identically — the anchor may be after the head", () => {
    const state = stateWithText();
    const rightToLeft = buildStrokeTransaction(state, stroke({ anchorPos: 6, headPos: 1 }));
    const leftToRight = buildStrokeTransaction(state, stroke({ anchorPos: 1, headPos: 6 }));

    expect(highlightColors(state, rightToLeft.transaction.doc)).toEqual(
      highlightColors(state, leftToRight.transaction.doc),
    );
  });

  it("erases highlights of any color across the swept range", () => {
    const highlighted = stateWithText().apply(
      buildStrokeTransaction(stateWithText(), stroke({ color: GREEN })).transaction,
    );
    expect(highlightColors(highlighted)[0]).toBe(GREEN);

    const { transaction } = buildStrokeTransaction(
      highlighted,
      stroke({ mode: "erase", color: YELLOW }),
    );
    expect(highlightColors(highlighted, transaction.doc).slice(0, 5)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("treats a stroke that never moved as a tap: caret placed, doc untouched", () => {
    const state = stateWithText();
    const { transaction, wasTap } = buildStrokeTransaction(
      state,
      stroke({ anchorPos: 4, headPos: 4 }),
    );

    expect(wasTap).toBe(true);
    expect(transaction.docChanged).toBe(false);
    expect(transaction.selection.empty).toBe(true);
    expect(transaction.selection.from).toBe(4);
  });

  it("commits as a single undoable step", () => {
    const { transaction } = buildStrokeTransaction(stateWithText(), stroke());
    expect(transaction.steps).toHaveLength(1);
  });
});
