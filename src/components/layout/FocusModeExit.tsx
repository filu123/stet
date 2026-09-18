"use client";

import { useEffect } from "react";

import { Minimize2 } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { exitBrowserFullscreen } from "@/lib/utils/fullscreen";
import { useBookModeStore } from "@/stores/book-mode-store";
import { useFocusModeStore } from "@/stores/focus-mode-store";

/**
 * Focus mode's escape hatches.
 *
 * `useFocusModeShortcuts` is headless and lives in the app shell so Escape
 * always works, wherever focus mode was entered. The visible button is
 * rendered by the editor toolbar row instead of floating over the page —
 * a fixed corner button would land on top of the sticky toolbar.
 *
 * Book mode sits on top of focus mode, so one exit drops both: there is only
 * ever one way out, whichever of the two you think you are in.
 */

export function leaveFocusMode(): void {
  useFocusModeStore.getState().setFocusMode(false);
  useBookModeStore.getState().setBookMode(false);
  exitBrowserFullscreen();
}

export function useFocusModeShortcuts(): void {
  const isFocusMode = useFocusModeStore((state) => state.isFocusMode);

  useEffect(() => {
    if (!isFocusMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // defaultPrevented: something closer to the user (a dialog, a picker)
      // already claimed this Escape.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      leaveFocusMode();
    };

    // Leaving fullscreen by F11 or a system gesture drops focus mode too, so
    // the two never disagree.
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) leaveFocusMode();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isFocusMode]);
}

/** Renders only in focus mode; otherwise the toolbar row keeps its layout. */
export function FocusModeExitButton() {
  const isFocusMode = useFocusModeStore((state) => state.isFocusMode);

  if (!isFocusMode) return null;

  return (
    <IconButton
      aria-label="Exit focus mode (Esc)"
      title="Exit focus mode (Esc)"
      onClick={leaveFocusMode}
    >
      <Minimize2 className="size-4" aria-hidden />
    </IconButton>
  );
}
