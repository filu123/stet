"use client";

import { Loader2 } from "lucide-react";

import { useSaveStatusStore } from "@/stores/save-status-store";

/** Subtle autosave state readout for the TopBar: "Saving…" → "Saved". */
export function SaveStatusIndicator() {
  const status = useSaveStatusStore((state) => state.status);

  if (status === "idle") return null;

  return (
    <span
      role="status"
      className="flex items-center gap-1.5 text-xs text-content-tertiary"
    >
      {status === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Saving…
        </>
      ) : (
        "Saved"
      )}
    </span>
  );
}
