"use client";

import { ChevronLeft, ChevronRight, Highlighter, PanelBottom, PanelTop } from "lucide-react";

/**
 * Shown once, over the first book opened.
 *
 * The tap zones are invisible by design — a reading screen should be text and
 * nothing else — which means they are also undiscoverable. One card, one tap
 * to dismiss, never seen again.
 */
export function GestureHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="reader-hint" onPointerUp={onDismiss}>
      <div className="reader-hint-card">
        <p className="text-sm font-medium text-content-primary">Reading by thumb</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-content-secondary">
          <li className="flex items-center gap-2">
            <PanelTop className="size-4 shrink-0 text-content-tertiary" aria-hidden />
            Tap the top for the menu
          </li>
          <li className="flex items-center gap-2">
            <ChevronLeft className="size-4 shrink-0 text-content-tertiary" aria-hidden />
            Tap the left edge to go back
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="size-4 shrink-0 text-content-tertiary" aria-hidden />
            Tap anywhere else — or swipe — to go on
          </li>
          <li className="flex items-center gap-2">
            <Highlighter className="size-4 shrink-0 text-content-tertiary" aria-hidden />
            Press and hold to highlight — or sweep a stylus across the line
          </li>
          <li className="flex items-center gap-2">
            <PanelBottom className="size-4 shrink-0 text-content-tertiary" aria-hidden />
            Tap the bar at the bottom for settings
          </li>
        </ul>
        <p className="mt-4 text-xs text-content-tertiary">Tap to start</p>
      </div>
    </div>
  );
}
