"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while reading.
 *
 * A phone that dims mid-paragraph is a session ended. Best-effort: the API
 * needs a visible page and isn't everywhere (iOS from 16.4), and the lock is
 * dropped by the system whenever the tab is hidden — hence the re-acquire on
 * visibility change.
 */
export function useWakeLock(isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let isCancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (isCancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        /* denied, unsupported, or the tab lost focus mid-request */
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      isCancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [isEnabled]);
}
