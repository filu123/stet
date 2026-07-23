"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `md` breakpoint: below 768px the sidebar becomes an overlay.
const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * True on viewports narrower than the `md` breakpoint. Server-rendered as
 * `false` (desktop-first), then corrected after hydration — no layout flash
 * on desktop and no hydration mismatch.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
