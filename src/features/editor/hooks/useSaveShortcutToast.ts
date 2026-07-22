"use client";

import { useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 2000;

/**
 * Intercepts ⌘S/Ctrl+S (people will press it) — prevents the browser's save
 * dialog and returns visibility for a "saved automatically" toast.
 */
export function useSaveShortcutToast(): boolean {
  const [isToastVisible, setIsToastVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsToastVisible(true);
        if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(
          () => setIsToastVisible(false),
          TOAST_DURATION_MS,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  return isToastVisible;
}
