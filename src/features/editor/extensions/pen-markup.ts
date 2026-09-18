import { Extension } from "@tiptap/core";
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Stylus markup: sweeping an S Pen (or any `pointerType: "pen"` stylus) across
 * text highlights it, the way a marker would. Finger and mouse input are left
 * completely alone — they still scroll and select as before.
 *
 * A stroke never mutates the document while it is in progress; it paints a
 * preview decoration and commits ONE transaction on lift, so a swipe is a
 * single undo step.
 *
 * Erasing: starting a stroke on text that already carries the selected color
 * removes highlights instead of adding them (same-color-erase, like a real
 * marker). The palette's eraser forces that mode for any color.
 */

const HIGHLIGHT_MARK = "highlight";

/** A pen tap shorter than this many characters places the caret instead. */
const TAP_MAX_SPAN = 1;

/** How long the editor keeps stylus-mode after the pen leaves hover range. */
const HOVER_GRACE_MS = 1200;

/**
 * The active tool, mirrored here from `pen-markup-store` by the palette.
 *
 * A plain module value rather than a store import on purpose: this file is
 * pulled in by `buildEditorExtensions()`, which the document API route loads
 * on the server — importing a persisted zustand store there would touch
 * `localStorage` in Node.
 */
interface PenTool {
  color: string;
  isEraser: boolean;
}

let penTool: PenTool = { color: "var(--pill-yellow-bg)", isEraser: false };

export function setPenTool(tool: PenTool): void {
  penTool = tool;
}

/** Called when a stylus is first seen, so the palette can reveal itself. */
let onPenDetected: (() => void) | null = null;

export function setPenDetectedHandler(handler: (() => void) | null): void {
  onPenDetected = handler;
}

export interface PenStroke {
  /** Where the pen touched down. */
  anchorPos: number;
  /** Where the pen is now. */
  headPos: number;
  mode: "apply" | "erase";
  color: string;
}

export const penMarkupKey = new PluginKey<PenStroke | null>("penMarkup");

function strokeRange(stroke: PenStroke): { from: number; to: number } {
  return {
    from: Math.min(stroke.anchorPos, stroke.headPos),
    to: Math.max(stroke.anchorPos, stroke.headPos),
  };
}

function posAtEvent(view: EditorView, event: PointerEvent): number | null {
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  return coords ? coords.pos : null;
}

/** True when `pos` already sits inside a highlight of exactly `color`. */
function hasSameColorHighlight(view: EditorView, pos: number, color: string): boolean {
  const markType = view.state.schema.marks[HIGHLIGHT_MARK];
  if (!markType) return false;
  const to = Math.min(pos + 1, view.state.doc.content.size);
  if (to <= pos) return false;
  return view.state.doc.rangeHasMark(pos, to, markType.create({ color }));
}

/**
 * Chrome on Android pans the page for stylus drags unless `touch-action` was
 * already `none` when the gesture began — too late to set it on pointerdown.
 * The S Pen reports hover, so the class goes on while the pen is near the
 * screen and comes off shortly after it leaves, keeping finger scrolling.
 */
function trackStylusHover(view: EditorView): () => void {
  let clearTimer: ReturnType<typeof setTimeout> | undefined;

  const enter = (event: PointerEvent) => {
    if (event.pointerType !== "pen") return;
    onPenDetected?.();
    clearTimeout(clearTimer);
    view.dom.classList.add("pen-hovering");
  };

  const leave = (event: PointerEvent) => {
    if (event.pointerType !== "pen") return;
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => view.dom.classList.remove("pen-hovering"), HOVER_GRACE_MS);
  };

  view.dom.addEventListener("pointerover", enter);
  view.dom.addEventListener("pointerdown", enter);
  view.dom.addEventListener("pointerout", leave);

  return () => {
    clearTimeout(clearTimer);
    view.dom.removeEventListener("pointerover", enter);
    view.dom.removeEventListener("pointerdown", enter);
    view.dom.removeEventListener("pointerout", leave);
  };
}

export const PenMarkup = Extension.create({
  name: "penMarkup",

  addProseMirrorPlugins() {
    return [
      new Plugin<PenStroke | null>({
        key: penMarkupKey,

        view: (editorView) => {
          const stopHoverTracking = trackStylusHover(editorView);
          return { destroy: stopHoverTracking };
        },

        state: {
          init: () => null,
          apply(transaction, stroke) {
            const meta = transaction.getMeta(penMarkupKey) as PenStroke | null | undefined;
            if (meta !== undefined) return meta;
            if (!stroke) return null;
            // Keep the in-flight stroke pinned to its text if the doc shifts.
            return {
              ...stroke,
              anchorPos: transaction.mapping.map(stroke.anchorPos),
              headPos: transaction.mapping.map(stroke.headPos),
            };
          },
        },

        props: {
          decorations(state) {
            const stroke = penMarkupKey.getState(state);
            if (!stroke) return null;
            const { from, to } = strokeRange(stroke);
            if (to <= from) return null;
            return DecorationSet.create(state.doc, [
              Decoration.inline(from, to, {
                class: stroke.mode === "erase" ? "pen-stroke-erase" : "pen-stroke-apply",
                style:
                  stroke.mode === "apply" ? `background-color: ${stroke.color}` : undefined,
              }),
            ]);
          },

          handleDOMEvents: {
            pointerdown(view, event) {
              if (event.pointerType !== "pen" || !view.editable) return false;
              const pos = posAtEvent(view, event);
              if (pos === null) return false;

              const { color, isEraser } = penTool;
              const mode =
                isEraser || hasSameColorHighlight(view, pos, color) ? "erase" : "apply";

              // Capture on the editor so a stroke that wanders outside it still
              // delivers moves (and its own pointerup) here.
              try {
                view.dom.setPointerCapture(event.pointerId);
              } catch {
                /* capture is best-effort; the stroke still works without it */
              }

              event.preventDefault();
              view.dispatch(
                view.state.tr.setMeta(penMarkupKey, {
                  anchorPos: pos,
                  headPos: pos,
                  mode,
                  color,
                } satisfies PenStroke),
              );
              return true;
            },

            pointermove(view, event) {
              const stroke = penMarkupKey.getState(view.state);
              if (!stroke || event.pointerType !== "pen") return false;
              event.preventDefault();
              const pos = posAtEvent(view, event);
              // Off the text (margins, past the last line) — keep the last head.
              if (pos === null || pos === stroke.headPos) return true;
              view.dispatch(view.state.tr.setMeta(penMarkupKey, { ...stroke, headPos: pos }));
              return true;
            },

            pointerup(view, event) {
              const stroke = penMarkupKey.getState(view.state);
              if (!stroke || event.pointerType !== "pen") return false;
              event.preventDefault();
              try {
                view.dom.releasePointerCapture(event.pointerId);
              } catch {
                /* already released */
              }
              commitStroke(view, stroke);
              return true;
            },

            pointercancel(view, event) {
              const stroke = penMarkupKey.getState(view.state);
              if (!stroke || event.pointerType !== "pen") return false;
              view.dispatch(view.state.tr.setMeta(penMarkupKey, null));
              return true;
            },
          },
        },
      }),
    ];
  },
});

/**
 * Turns a finished stroke into the single transaction that commits it:
 * clears the preview, then either marks/unmarks the swept range or — for a
 * tap that never moved — just places the caret.
 *
 * Pure (state in, transaction out) so the stroke rules are unit-testable
 * without a live EditorView.
 */
export function buildStrokeTransaction(
  state: EditorState,
  stroke: PenStroke,
): { transaction: Transaction; wasTap: boolean } {
  const markType = state.schema.marks[HIGHLIGHT_MARK];
  const { from, to } = strokeRange(stroke);
  const transaction = state.tr.setMeta(penMarkupKey, null);

  if (!markType || to - from < TAP_MAX_SPAN) {
    // A tap, not a sweep — behave like a normal click and place the caret.
    transaction.setSelection(TextSelection.near(transaction.doc.resolve(stroke.anchorPos)));
    return { transaction, wasTap: true };
  }

  if (stroke.mode === "erase") {
    transaction.removeMark(from, to, markType);
  } else {
    transaction.addMark(from, to, markType.create({ color: stroke.color }));
  }
  return { transaction, wasTap: false };
}

/** Ends a stroke: dispatches its commit transaction. */
function commitStroke(view: EditorView, stroke: PenStroke): void {
  const { transaction, wasTap } = buildStrokeTransaction(view.state, stroke);
  view.dispatch(transaction);
  // A tap should behave like a click: caret placed, editor focused. A sweep
  // deliberately leaves focus alone so the tablet keyboard stays down.
  if (wasTap) view.focus();
}
