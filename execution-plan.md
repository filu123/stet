# Execution Plan

> The ordered build sequence. Work top to bottom — **never start a step before the previous step's "Done when" checklist fully passes.** One step = one focused working session = ideally one commit.
>
> Product vision: `plan.md` · Code rules: `AGENTS.md`

**Gate for every step (in addition to its own checklist):**
1. `npm run lint` — zero warnings introduced
2. `npm run build` — succeeds
3. Manual test in browser (`npm run dev`) — the step's "Done when" items verified by actually using the app
4. No console errors in the browser devtools

---

## Phase A — The editor shell (v0.1)

### Step 1 — App shell layout ✅
Build the Craft-style frame everything lives in.

- `components/layout/AppShell.tsx` — gray app background, flex layout
- `components/layout/Sidebar.tsx` — collapsible left sidebar (empty list for now), `components/layout/TopBar.tsx` — breadcrumb placeholder, nearly invisible chrome
- `components/layout/DocumentCard.tsx` — the floating white page surface (`bg-surface-card rounded-card border-border-subtle` — no shadows), max-width ~720px, centered
- Wire into `app/page.tsx` (replace placeholder content)

**Done when:**
- [ ] Sidebar + top bar + floating card render and match the Craft reference vibe (calm, generous whitespace)
- [ ] Sidebar collapses/expands with smooth animation
- [ ] Layout holds up at 1440px, 1024px, and ~768px widths
- [ ] Dark mode (macOS system toggle) looks intentional, not inverted-by-accident

### Step 2 — TipTap editor mounted ✅
A working editor inside the DocumentCard.

- `features/editor/components/DocumentEditor.tsx` (`"use client"`, `immediatelyRender: false`)
- `features/editor/hooks/useDocumentEditor.ts` — editor instance config (StarterKit + Placeholder)
- Typography styling for editor content: headings, paragraphs, lists, blockquote, code — Craft-quality (strong doc title, thin divider under it, generous line-height)

**Done when:**
- [ ] Can type; bold/italic (⌘B/⌘I), headings (`#` + space), lists (`-` + space), blockquote, code block all work via markdown shortcuts
- [ ] Placeholder text shows in an empty doc and disappears on typing
- [ ] Content typography looks like a Craft page, in light and dark
- [ ] No SSR hydration warnings in the console

### Step 3 — Persistence: autosave + load ✅
Documents survive reload. First real use of the data layer.

- `features/editor/hooks/useAutosaveDocument.ts` — debounced (~800ms) save of TipTap JSON via `updateDocumentContent`
- `features/documents/hooks/useDocument.ts` — load one document (`useLiveQuery`)
- On first visit: create a document automatically and use it (single-doc experience for now)
- Save-state indicator in TopBar ("Saved · just now" / subtle spinner while saving)

**Done when:**
- [ ] Type → wait a second → hard-reload → content is fully restored
- [ ] Rapid typing does not spam IndexedDB (verify debounce: one write per pause, check via Dexie devtools or console breakpoint)
- [ ] Save indicator transitions saving → saved correctly
- [ ] Works in a fresh browser profile (empty IndexedDB → doc auto-created, no crash)

### Step 4 — Multiple documents + sidebar list ✅
From single doc to a real doc list.

- `features/documents/components/SidebarDocumentList.tsx` — recency-ordered list (`listDocumentsByRecency` via `useLiveQuery`), active doc highlighted
- New document button; rename (inline edit of title or first-heading-as-title — pick one, document the choice in plan.md); delete with confirm
- Route: `app/document/[documentId]/page.tsx`, `/` redirects to most recent doc (create one if none)
- Doc title shown in TopBar breadcrumb

**Done when:**
- [ ] Create → appears in sidebar and opens; edit → its `updatedAt` bumps it to top
- [ ] Switching docs loads the right content every time (no bleed-over between docs — test by rapid switching)
- [ ] Delete active doc → app lands somewhere sensible (next doc or fresh doc), no dead state
- [ ] Reload on `/document/<id>` deep link works

### Step 5 — Export / import Markdown ✅
The local-first escape hatch.

- `features/documents/lib/markdown-serializer.ts` — TipTap JSON ↔ Markdown
- Export current doc as `.md` download; import `.md` as new document (TopBar `⋯` menu)

**Done when:**
- [ ] Export a doc with headings/lists/bold/code → the `.md` file is correct
- [ ] Round-trip test: export → import → docs are visually identical
- [ ] Importing a random real-world `.md` file produces a sane document, malformed input fails gracefully (message, not crash)

### Step 5.5 — Formatting bubble menu ✅ *(also gained the fixed docx-style toolbar)*
The Craft-style floating menu on text selection — no fixed toolbar, ever.

- `features/editor/components/FormattingBubbleMenu.tsx` — TipTap `BubbleMenu` (free, `@tiptap/react/menus`): Bold / Italic / Strike / inline code · H1 / H2 · bullet list / quote · highlight color pills (the 4 Craft colors) + clear
- `@tiptap/extension-highlight` (multicolor) added to the editor; `<mark>` styled as Craft pills via tokens
- Flat design: `bg-surface-card`, hairline border, **no shadow** (AGENTS.md law)
- In Step 10, AI actions (Improve/Shorten/…) join this same menu

**Done when:**
- [ ] Select text → menu appears above selection; collapse selection → it disappears
- [ ] Every button applies its format AND shows active state (lit) when the cursor is in that format
- [ ] Highlight pills apply the 4 token colors; clear removes; colors adapt in dark mode
- [ ] Menu looks flat and Craft-like in light + dark, near viewport edges it stays on-screen
- [ ] No console errors while rapidly selecting/deselecting

### Step 6 — v0.1 polish pass ✅ *(block hover states deferred until block handles exist — nothing to hover yet)*
- Craft-style details: block hover states, selection color, smooth micro-animations
- Empty states (no docs, empty doc) feel designed
- Keyboard: ⌘S is a no-op with a "saved automatically" toast (people will press it)
- Full dark-mode audit of every surface built so far

**Done when:**
- [ ] 10-minute real writing session feels good — no jank, no layout shifts, nothing ugly
- [ ] Someone who has seen Craft would say "yes, that's the vibe"

---

## Phase B — The AI twist (v0.2)

### Step 7 — Settings + BYO key ✅ *(Gemini added as third provider)*
- `features/settings/components/SettingsDialog.tsx` — provider (Anthropic/OpenAI), API key, model picker, mode toggle (on-demand/proactive), gear icon in TopBar
- `features/settings/lib/settings-storage.ts` — localStorage read/write; key never leaves the machine except to the provider API
- `stores/settings-store.ts` — non-secret settings in Zustand; key read at call time only (AGENTS.md rule)

**Done when:**
- [ ] Key save → reload → still configured (masked display, never plain text after entry)
- [ ] Key appears nowhere in exports, logs, or error messages (grep the built output & test an error path)
- [ ] A "test connection" button verifies the key with a minimal API call and reports success/failure clearly

### Step 8 — AI review pipeline (logic before UI) ✅ *(live-API round trip verified in Step 9 via the UI)*
- `features/ai-assistant/lib/provider-client.ts` — provider-agnostic `requestReview(text): Promise<Suggestion[]>`
- `features/ai-assistant/lib/review-prompt.ts` — prompt + structured output (suggestions with type/range/note/replacement)
- `features/ai-assistant/lib/suggestion-parser.ts` — validate/parse model output into typed `Suggestion` objects; **map text offsets → ProseMirror positions** (the hard part — model returns quoted text + occurrence index, we locate it in the doc; never trust raw offsets)
- `features/ai-assistant/types.ts` — `Suggestion` discriminated union (`grammar` / `style` / `highlight` / `circle`)

**Done when:**
- [ ] Feed a test paragraph with 3 known errors → typed suggestions come back with **correct ProseMirror ranges** (log positions, verify against doc)
- [ ] Malformed model output → parser rejects gracefully, never a crash
- [ ] Both providers work behind the same interface
- [ ] Position mapping survives edge cases: repeated phrases, text at doc start/end, emoji/multibyte characters

### Step 9 — AI markup rendering (the signature feature) ✅
- `features/editor/extensions/ai-markup-extension.ts` — ProseMirror decorations: wavy underline (grammar), soft highlight (style), "circled" range (border/hand-drawn effect)
- `features/ai-assistant/components/AiAssistantButton.tsx` — the floating AI icon; click → review runs → decorations appear
- `features/ai-assistant/components/SuggestionPopover.tsx` — click a marked range → popover with note + replacement + Accept / Dismiss
- Accept applies replacement as a real edit **through the editor transaction** (document changes only here — AGENTS.md rule)

**Done when:**
- [ ] Review a flawed doc → underlines/highlights/circles appear on the right ranges
- [ ] Decorations **do not** change the document (export before/after review → identical Markdown)
- [ ] **Typing with active decorations keeps them anchored to their text** (add/remove text before a marked range → it stays on the right words)
- [ ] Accept replaces exactly the marked text; Dismiss removes the mark; both update remaining decorations correctly
- [ ] Undo (⌘Z) after Accept restores the original text cleanly

### Step 10 — Help-me-write actions ✅
- Bubble menu on text selection: Improve / Shorten / Expand / Fix grammar
- Result shown as a suggestion (accept/reject), not silently applied
- "Continue writing" action at document end

**Done when:**
- [ ] Each action produces sensible output on real text; reject leaves the doc untouched
- [ ] Streaming or a clear loading state — never a frozen UI while waiting
- [ ] Errors (bad key, rate limit, offline) surface as friendly messages

### Step 11 — Proactive mode ✅
- Debounced (
~3s idle) paragraph-level review of **changed paragraphs only** (cost control)
- Respects the settings toggle; subtle activity indicator; per-paragraph result cache keyed by content hash

**Done when:**
- [ ] Marks appear a few seconds after you stop typing, only in edited paragraphs
- [ ] Verify request behavior in the network tab: no request storms, unchanged paragraphs are never re-sent
- [ ] Toggling proactive off stops all background calls immediately

### Step 11.5 — File-based document storage *(added pre-release: durability)*
Documents become real files on disk (Obsidian-style), killing the
browser-storage data-loss risk (incognito, cache clears, Safari eviction).

- Next API routes (`/api/documents`, `/api/storage`) read/write a data folder
  (`STET_DATA_DIR`, default `~/Stet`): one pretty-printed `.json` per document
  (lossless canonical) + a readable `.md` sibling named by title slug
- `features/documents/lib` splits into `browser-repository` (existing Dexie),
  `file-repository` (fetch), and a `storage-backend` facade with runtime
  detection: server routes reachable → files; static hosting → browser
  fallback. Public repository API unchanged — no component churn
- Dexie `liveQuery` reactivity replaced by a backend-agnostic
  subscribe/notify: hooks refetch on any mutation
- One-time migration: existing IndexedDB documents copied into the folder on
  first files-mode launch
- Settings dialog shows where documents live

**Done when:**
- [ ] Creating/editing a doc writes `<id>.json` (+ `.md` sibling) into the data dir; edits update it after autosave
- [ ] Rename updates the `.md` slug; delete removes both files
- [ ] Wiping IndexedDB/site data loses NOTHING — reload shows all docs (the whole point)
- [ ] Pre-existing IndexedDB docs migrate to files on first load, once
- [ ] With API routes unreachable (static hosting simulation), the app falls back to browser storage and still works fully
- [ ] Sidebar/breadcrumb stay reactive (create/rename/delete reflect immediately)
- [ ] Invalid document ids rejected by the API (no path traversal); lint/build/no console errors

---

## Phase C — Release (v1.0)

### Step 12 — Hardening + tests ✅
- Vitest set up (`npm test`, jsdom + tsconfig paths); 42 tests across `suggestion-parser`,
  `position-mapper` (occurrence clamping, cross-block reject, emoji alignment),
  `markdown-serializer` (round-trip + plain text), `normalize-url`, `extract-snippet`,
  `note-commands` (collect/merge/order), and `api-key-storage`
- Error boundaries: route-level `app/error.tsx` + a reusable `ErrorBoundary` wrapping the
  AI/notes UI so an AI crash can't take the editor down
- Performance verified on a 12k-word document: ~800ms load, ~60ms to type 11 chars

**Done when:**
- [x] `npm test` runs in CI-able fashion; parser + serializer edge cases covered
- [x] Killing the network mid-review degrades gracefully (verified: no crash, editor stays editable)

### Step 13 — Open source packaging
- README: hero screenshot/GIF, 3-command install, BYO-key explanation, privacy statement (everything local)
- MIT `LICENSE`, `CONTRIBUTING.md` (points to AGENTS.md), decide final app name → update package.json/metadata
- GitHub Actions: lint + build + test on PR

**Done when:**
- [ ] A stranger can go clone → `npm install` → `npm run dev` → writing with AI in under 5 minutes, using only the README
- [ ] CI green

---

## Deferred (do NOT build early — see AGENTS.md "When in doubt")

Projects/Spaces/Folders hierarchy · Ollama/local models · Tauri desktop wrapper · sub-pages · collaboration

## Standing testing notes

- **The position-mapping code (Step 8) and decoration anchoring (Step 9) are the riskiest parts of the whole app.** Budget extra verification time there; that's also where automated tests pay off first.
- Always test in one Chromium browser + Safari (WebKit IndexedDB and selection behavior differ).
- Every phase ends with a full dark-mode + narrow-viewport pass.
- When a step reveals a wrong earlier decision, fix it then — don't stack workarounds.
