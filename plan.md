# Open Source AI Document Editor — Plan

> Working name: TBD
> An open source, local-first document editor with an AI writing assistant that marks up your text like a human editor — highlights, circles, corrections, suggestions. Clean, Apple-style design inspired by Craft.do.

---

## 1. Vision

A document editor in the spirit of Google Docs / Craft, but:

- **The twist:** a small AI icon lives in the editor. It helps you write, corrects grammar, and visually marks up the document (highlight, underline, circle, annotate) instead of just chatting.
- **Open source** — anyone can clone it and run it themselves. No accounts, no server, no telemetry.
- **Not just an editor, an app** — v1 is a single-doc editor experience, but the product grows into a workspace: projects, folders, arranging documents (Craft-like structure: Spaces → Folders → Documents).

## 2. Core decisions (settled)

| Decision | Choice |
|---|---|
| Platform | **Web app** (browser). Optional Tauri desktop wrapper later. |
| Framework | **Next.js (latest)** |
| Editor engine | **TipTap** (ProseMirror-based, headless) |
| Storage | **Local-first** — documents in IndexedDB, export/import to `.md` |
| AI | **Bring-your-own-key** (Anthropic / OpenAI), key stored locally, calls go browser → API directly. Ollama support later for local models. |
| AI mode | User setting: **proactive** (Grammarly-style, marks appear as you write) or **on-demand** (click the AI icon to review) |
| Collaboration | None in v1 — strictly single-user |
| Distribution | Clone & run yourself (`git clone` → `npm install` → `npm run dev`). No hosted version for now. |

## 3. Design direction — Craft.do inspired

**Reference: Craft.do.** The design bar is high — this is a core feature, not polish.

Key elements to replicate (from Craft):

- **Layout:** soft off-white/light-gray app background; the document sits on a **floating white "card"** with large rounded corners and a hairline border — the page feels like a physical sheet. **Strictly no shadows anywhere in the app** (owner preference — depth comes from surface contrast and borders).
- **Sidebar:** minimal, calm, slightly recessed. Doc tree / table of contents with small document icons. Collapsible.
- **Top bar:** breadcrumb navigation (`Folder / Document / Section`), nearly invisible chrome.
- **Typography:** clean sans-serif (SF Pro feel — use Inter or system font stack), generous line height, strong clear headings with thin divider under the doc title.
- **Inline color pills:** highlighted terms rendered as small rounded colored chips (yellow / green / blue / purple backgrounds, monospace-ish) — great visual language we can reuse for AI annotations.
- **Callout blocks:** tinted rounded background blocks (light gray, light green) for notes/asides.
- **Details:** subtle hover states, floating `⋯` action button at block level, smooth micro-animations, restrained color — color is used for *meaning*, not decoration.
- Light mode first; dark mode designed early (Craft's dark mode is excellent), not bolted on.

## 4. The AI assistant

The differentiator. A small floating AI icon in the editor.

**Capabilities (v1):**
- Grammar & spelling correction
- Style/clarity suggestions
- Visual document markup: highlight ranges, wavy underlines, "circled" text, margin/inline annotations
- Help-me-write: continue, rewrite, shorten, expand selection

**How markup works (technical):**
- AI returns structured output: `{ type, from, to, note, replacement }`
- Rendered as **ProseMirror decorations** via TipTap — visual layers on top of the text that don't modify the document
- User accepts/rejects each suggestion (accept applies the replacement as a real edit)

**Modes (user setting):**
- **On-demand:** click the AI icon → it reviews the doc/selection → markup appears
- **Proactive:** debounced background checks as you type (careful with API cost — batch, only changed paragraphs)

**Settings panel:** API provider + key (stored in localStorage only), model choice, proactive/on-demand toggle, aggressiveness level.

*(Detailed AI interaction design: to be discussed — next planning session.)*

## 5. Tech stack

- **Next.js** (App Router, latest) — editor is client-only (`"use client"`, `immediatelyRender: false`)
- **TipTap** — core + community extensions (placeholder, bubble menu, slash commands later). Study **Novel** (Notion-style TipTap/Next.js editor) for patterns.
- **Tailwind CSS** — for the Craft-style design system
- **IndexedDB** (via `idb` or Dexie) — document storage
- **Zustand** (or similar light store) — app state
- **Anthropic / OpenAI SDKs** — called client-side with user's key
- No backend, no database, no auth. The app builds to a static-ish Next.js app.

## 6. Roadmap

### v0.1 — The editor
- [ ] Next.js project scaffold + Tailwind + design tokens (colors, radii, shadows — Craft-style)
- [ ] TipTap editor: headings, lists, bold/italic, code, callout blocks, highlight pills
- [ ] Document "card" layout + minimal top bar
- [ ] Autosave to IndexedDB, doc list (simple), export/import Markdown

### v0.2 — The AI twist
- [ ] Settings: BYO API key, provider/model picker
- [ ] AI icon + on-demand review flow
- [ ] Decoration rendering: highlights, wavy underlines, circles, annotations
- [ ] Accept/reject suggestions UI
- [ ] Help-me-write actions on selection (bubble menu)

### v0.3 — Polish & proactive
- [ ] Proactive mode (debounced, paragraph-level checking)
- [ ] Dark mode
- [ ] Keyboard shortcuts, command palette (⌘K)
- [ ] Onboarding: friendly empty state + key setup flow

### v1.0 — Open source release
- [ ] README with one-command setup, screenshots/GIFs
- [ ] License (MIT), contributing guide
- [ ] Ollama/local model support (nice-to-have)

### Future (post-v1)
- Projects / Spaces / Folders — document management & organization (Craft-like hierarchy)
- Sub-pages / nested documents
- Tauri desktop wrapper (native feel, file-system storage)
- Real-time collaboration (maybe, much later)

## 7. Decisions made during build

- **Documents are files on disk** (Step 11.5): the local Next server persists each document as JSON (+ readable Markdown sibling) in `~/Stet` (`STET_DATA_DIR`). IndexedDB remains as an automatic fallback for static hosting (the future free playground). Rationale: browser storage dies with cache clears/incognito/Safari eviction; files are user-owned, backupable, and syncable — and they set up both the Tauri desktop app and the future paid cloud sync.
- **Business direction**: open source (self-host, free) now; hosted cloud (bundled AI, sync, zero setup) later IF the OSS launch shows demand. License decision (MIT vs AGPL) deferred to Step 13 — leaning AGPL to protect a future cloud.

- **The app is named "Stet"** — the proofreader's mark meaning "let it stand", mirroring the accept/dismiss suggestion loop at the heart of the app. The red **squiggle** (editor's wavy underline) is the brand mark/logo. Internal storage keys (IndexedDB name, localStorage keys) keep their old identifiers until a 1.0 migration — renaming them would orphan existing local documents.

- **Document titles** are edited inline in the document header (an input styled as the h1). The first heading in the content is NOT auto-promoted to title — title and content are independent. (Step 4)
- **Two formatting surfaces**: a fixed docx-style toolbar (sticky above the document, Google Docs-like) AND the selection bubble menu. Both flat, no shadows. (Step 5.5)
- **Card radius reduced to 8px** — owner found 14px too round; the docx-editor look is the reference. (Step 5.5)

## 8. Open questions

- App name + repo name
- Exact AI interaction design (proactive UX, how "circling" looks, margin notes vs inline) — **next discussion**
- Markdown vs TipTap JSON as canonical storage format (JSON canonical, Markdown for export — likely)
- How much of the doc to send for AI review (whole doc vs selection vs changed paragraphs) — cost/quality tradeoff
