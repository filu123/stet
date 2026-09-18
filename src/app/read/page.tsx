"use client";

import { LibraryScreen } from "@/features/reader";

/**
 * `/read` — the shelf.
 *
 * No AppShell: the reader is a phone-first surface of its own, and the editor's
 * sidebar and top bar have nothing to say here.
 */
export default function LibraryPage() {
  return <LibraryScreen />;
}
