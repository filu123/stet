import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Google Docs-style page view: measures rendered block heights and injects
 * widget "gap" decorations wherever content crosses a page boundary, so the
 * document renders as separate sheets. Purely visual — the document content
 * is never touched.
 */

/** Usable content height per sheet at 96dpi (paper minus page margins). */
export const PAPER_CONTENT_HEIGHTS = { a4: 987, letter: 920 } as const;

/** Visual gap between sheets (includes next page's breathing room). */
export const PAGE_GAP_HEIGHT = 56;

interface PageViewConfig {
  pageHeight: number;
  gapHeight: number;
}

interface PageSpacer {
  pos: number;
  height: number;
}

interface PageViewState {
  config: PageViewConfig | null;
  decorations: DecorationSet;
}

export const pageViewPluginKey = new PluginKey<PageViewState>("pageView");

type PageViewMeta =
  | { type: "config"; config: PageViewConfig | null }
  | { type: "spacers"; spacers: PageSpacer[] };

export const PageViewExtension = Extension.create({
  name: "pageView",

  addProseMirrorPlugins() {
    return [
      new Plugin<PageViewState>({
        key: pageViewPluginKey,
        state: {
          init: () => ({ config: null, decorations: DecorationSet.empty }),
          apply(tr, pluginState) {
            const meta = tr.getMeta(pageViewPluginKey) as PageViewMeta | undefined;
            if (meta?.type === "config") {
              return {
                config: meta.config,
                decorations: meta.config
                  ? pluginState.decorations.map(tr.mapping, tr.doc)
                  : DecorationSet.empty,
              };
            }
            if (meta?.type === "spacers") {
              return { ...pluginState, decorations: createSpacerDecorations(tr.doc, meta.spacers) };
            }
            return {
              ...pluginState,
              decorations: pluginState.decorations.map(tr.mapping, tr.doc),
            };
          },
        },
        props: {
          decorations(state) {
            return pageViewPluginKey.getState(state)?.decorations;
          },
        },
        view: (editorView) => new PageViewController(editorView),
      }),
    ];
  },
});

/** Turns page view on (with sizes) or off. Called by the editor screen. */
export function setPageView(editor: Editor, config: PageViewConfig | null): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(pageViewPluginKey, { type: "config", config }),
  );
}

function createSpacerDecorations(doc: import("@tiptap/pm/model").Node, spacers: PageSpacer[]) {
  return DecorationSet.create(
    doc,
    spacers.map((spacer) =>
      Decoration.widget(
        spacer.pos,
        () => {
          const element = document.createElement("div");
          element.className = "page-gap";
          element.style.height = `${spacer.height}px`;
          element.contentEditable = "false";
          return element;
        },
        { side: -1, key: `page-gap-${spacer.pos}-${spacer.height}` },
      ),
    ),
  );
}

/**
 * Measures block heights after each render (debounced) and recomputes the
 * spacer list. Measurement uses each block's OWN height — independent of any
 * existing spacers — so the loop is stable: identical results are never
 * re-dispatched.
 */
class PageViewController {
  private isScheduled = false;
  private lastSpacersJson = "[]";

  constructor(private readonly view: EditorView) {
    this.scheduleMeasure();
  }

  update() {
    this.scheduleMeasure();
  }

  destroy() {}

  private scheduleMeasure() {
    if (this.isScheduled) return;
    this.isScheduled = true;
    window.setTimeout(() => {
      this.isScheduled = false;
      this.measure();
    }, 120);
  }

  private measure() {
    const view = this.view;
    if (view.isDestroyed) return;
    const pluginState = pageViewPluginKey.getState(view.state);
    if (!pluginState) return;

    if (!pluginState.config) {
      this.dispatchSpacers([]);
      return;
    }
    const { pageHeight, gapHeight } = pluginState.config;

    // Top-level DOM blocks (minus our own gap widgets) ↔ top-level doc nodes.
    const blockElements = Array.from(view.dom.children).filter(
      (element) => !element.classList.contains("page-gap"),
    ) as HTMLElement[];
    const blockPositions: number[] = [];
    let scanPos = 0;
    view.state.doc.forEach((node) => {
      blockPositions.push(scanPos);
      scanPos += node.nodeSize;
    });
    if (blockElements.length !== blockPositions.length) return; // DOM mid-update; next pass will run

    const spacers: PageSpacer[] = [];
    let contentY = 0;
    let pageBoundary = pageHeight;
    blockElements.forEach((element, index) => {
      const style = window.getComputedStyle(element);
      const blockHeight =
        element.offsetHeight +
        (parseFloat(style.marginTop) || 0) +
        (parseFloat(style.marginBottom) || 0);

      const crossesBoundary = contentY + blockHeight > pageBoundary && contentY > 0;
      const fitsOnAPage = blockHeight <= pageHeight;
      if (crossesBoundary && fitsOnAPage) {
        spacers.push({
          pos: blockPositions[index],
          height: Math.round(pageBoundary - contentY + gapHeight),
        });
        contentY = pageBoundary + gapHeight;
        pageBoundary = contentY + pageHeight;
      }
      contentY += blockHeight;
      // A block taller than a page just flows; advance the boundary past it.
      while (contentY > pageBoundary) pageBoundary += pageHeight;
    });

    this.dispatchSpacers(spacers);
  }

  private dispatchSpacers(spacers: PageSpacer[]) {
    const spacersJson = JSON.stringify(spacers);
    if (spacersJson === this.lastSpacersJson) return;
    this.lastSpacersJson = spacersJson;
    this.view.dispatch(
      this.view.state.tr.setMeta(pageViewPluginKey, { type: "spacers", spacers }),
    );
  }
}
