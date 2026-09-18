"use client";

import { BookOpen } from "lucide-react";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import { requestBrowserFullscreen } from "@/lib/utils/fullscreen";
import { useBookModeStore } from "@/stores/book-mode-store";
import { useFocusModeStore } from "@/stores/focus-mode-store";

/**
 * Enters book mode. It implies focus mode and fullscreen — a reader with a
 * sidebar and a URL bar around it is just a narrow document.
 *
 * Called from the click handler and nowhere else, because the fullscreen
 * request only counts inside a user gesture.
 */
export function enterBookMode(): void {
  useFocusModeStore.getState().setFocusMode(true);
  useBookModeStore.getState().setBookMode(true);
  requestBrowserFullscreen();
}

export function BookModeButton() {
  return (
    <ToolbarButton label="Book mode" onClick={enterBookMode}>
      <BookOpen className="size-3.5" aria-hidden />
    </ToolbarButton>
  );
}
