# feature: ai-assistant (v0.2 — not yet implemented)

The AI writing assistant: floating AI icon, document review flow, markup rendering
(highlights, wavy underlines, circles), accept/reject suggestions.

- `components/` — AI icon, suggestion cards, accept/reject UI
- `hooks/` — review orchestration (on-demand + proactive modes)
- `lib/` — provider clients (BYO key), prompt building, suggestion parsing

Key rule: AI markup renders as ProseMirror **decorations** — it never mutates the
document. Only an accepted suggestion becomes a real edit.
