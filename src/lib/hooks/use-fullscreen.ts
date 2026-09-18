"use client";

import { useCallback, useSyncExternalStore } from "react";

import { exitBrowserFullscreen, requestBrowserFullscreen } from "@/lib/utils/fullscreen";

/**
 * Browser fullscreen, as a toggle.
 *
 * `useSyncExternalStore` rather than an effect and some state: fullscreen is
 * owned by the browser, not by React. It can be left by pressing Escape, by a
 * system gesture, or by another tab taking over, and this way the button can
 * never disagree with the window it is describing.
 *
 * `isSupported` matters as much as the toggle. iOS Safari refuses fullscreen
 * for anything but a video, so on an iPhone the honest thing is to not offer
 * the button at all rather than offer one that does nothing.
 */
export function useFullscreen(): {
  isSupported: boolean;
  isFullscreen: boolean;
  toggle: () => void;
} {
  const isSupported = useSyncExternalStore(subscribeNever, getSupported, getFalse);
  const isFullscreen = useSyncExternalStore(subscribeToFullscreen, getFullscreen, getFalse);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) exitBrowserFullscreen();
    else requestBrowserFullscreen();
  }, []);

  return { isSupported, isFullscreen, toggle };
}

/** Module-level so the store identities stay stable across renders. */
function subscribeToFullscreen(onChange: () => void): () => void {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function subscribeNever(): () => void {
  return () => {};
}

function getSupported(): boolean {
  return typeof document.documentElement.requestFullscreen === "function";
}

function getFullscreen(): boolean {
  return document.fullscreenElement !== null;
}

/** The server has no window to fill. */
function getFalse(): boolean {
  return false;
}
