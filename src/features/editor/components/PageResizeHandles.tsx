"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import { FREE_WIDTH_MIN, useUiPreferencesStore } from "@/stores/ui-preferences-store";

/**
 * Drag handles on the document card's edges — rendered only in free-form
 * width mode. The card is centered, so dragging an edge by dx changes the
 * width by 2·dx. Max width = the toolbar's width; min = FREE_WIDTH_MIN.
 */
export function PageResizeHandles() {
  const setFreeWidth = useUiPreferencesStore((state) => state.setFreeWidth);

  const handlePointerDown = (side: "left" | "right") => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    const card = handle.parentElement;
    if (!card) return;

    const startX = event.clientX;
    const startWidth = card.getBoundingClientRect().width;
    const maxWidth =
      document.querySelector(".editor-toolbar-card")?.getBoundingClientRect().width ??
      card.parentElement?.getBoundingClientRect().width ??
      Number.MAX_SAFE_INTEGER;

    handle.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const delta = side === "right" ? dx : -dx;
      const width = Math.round(
        Math.min(maxWidth, Math.max(FREE_WIDTH_MIN, startWidth + delta * 2)),
      );
      setFreeWidth(width);
    };
    const handleUp = () => {
      handle.removeEventListener("pointermove", handleMove);
      handle.removeEventListener("pointerup", handleUp);
    };
    handle.addEventListener("pointermove", handleMove);
    handle.addEventListener("pointerup", handleUp);
  };

  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          role="separator"
          aria-label={`Resize page (${side} edge)`}
          onPointerDown={handlePointerDown(side)}
          className={`print-hidden absolute top-0 ${side === "left" ? "-left-1" : "-right-1"} flex h-full w-2.5 cursor-ew-resize items-center justify-center opacity-0 transition-opacity hover:opacity-100`}
        >
          <span className="h-16 w-1 rounded-full bg-accent" aria-hidden />
        </div>
      ))}
    </>
  );
}
