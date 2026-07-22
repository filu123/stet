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

/** The gray band between sheets. */
export const PAGE_GAP_HEIGHT = 48;

/** White breathing room at the top of each new sheet. */
const PAGE_TOP_PADDING = 44;

interface PageViewConfig {
  pageHeight: number;
  gapHeight: number;
}

interface PageSpacer {
  pos: number;
  /** White space finishing the current sheet (varies per page). */
  fillerHeight: number;
  gapHeight: number;
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
          // Three stacked zones: white remainder of the current sheet,
          // the gray between-sheets band, white top margin of the next sheet.
          const element = document.createElement("div");
          element.className = "page-gap";
          element.contentEditable = "false";

          const filler = document.createElement("div");
          filler.style.height = `${spacer.fillerHeight}px`;

          const band = document.createElement("div");
          band.className = "page-gap-band";
          band.style.height = `${spacer.gapHeight}px`;

          const topPadding = document.createElement("div");
          topPadding.style.height = `${PAGE_TOP_PADDING}px`;

          element.append(filler, band, topPadding);
          return element;
        },
        { side: -1, key: `page-gap-${spacer.pos}-${spacer.fillerHeight}` },
      ),
    ),
  );
}

/**
 * Measures REAL layout positions after each render (debounced) and recomputes
 * the spacer list. Each block's natural position = its rendered position minus
 * the spacers above it — exact regardless of document length (no accumulated
 * rounding or margin-collapse drift), and independent of the spacers
 * themselves, so the loop is stable: identical results are never re-dispatched.
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

    // Map top-level doc nodes to their positions.
    const blockPositions: number[] = [];
    let scanPos = 0;
    view.state.doc.forEach((node) => {
      blockPositions.push(scanPos);
      scanPos += node.nodeSize;
    });
    const domChildren = Array.from(view.dom.children) as HTMLElement[];
    const blockCount = domChildren.filter((el) => !el.classList.contains("page-gap")).length;
    if (blockCount !== blockPositions.length) return; // DOM mid-update; next pass will run

    const domTop = view.dom.getBoundingClientRect().top;
    const spacers: PageSpacer[] = [];
    let spacersHeightAbove = 0;
    let pageBoundary = pageHeight;
    let blockIndex = 0;

    for (const element of domChildren) {
      if (element.classList.contains("page-gap")) {
        spacersHeightAbove += element.offsetHeight;
        continue;
      }
      const rect = element.getBoundingClientRect();
      const naturalTop = rect.top - domTop - spacersHeightAbove;
      const naturalBottom = naturalTop + rect.height;
      const pos = blockPositions[blockIndex];
      blockIndex++;

      if (naturalBottom > pageBoundary) {
        if (naturalTop > 0 && rect.height <= pageHeight) {
          // Push this block to the top of a new sheet.
          spacers.push({
            pos,
            fillerHeight: Math.max(0, Math.round(pageBoundary - naturalTop)),
            gapHeight,
          });
          pageBoundary = naturalTop + pageHeight;
        } else {
          // Taller than a page (or the very first block): let it flow.
          while (naturalBottom > pageBoundary) pageBoundary += pageHeight;
        }
      }
    }

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
