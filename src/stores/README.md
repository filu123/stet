# stores

Zustand stores — one file per domain (e.g. `settings-store.ts`, `ui-store.ts`).

Only for state shared across distant components. Prefer local component state and
feature hooks first. Persistence goes through feature data layers, never directly
from a store into Dexie.
