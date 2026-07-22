import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { PageWidth } from "@/types/ui";

interface DocumentCardProps {
  children: ReactNode;
  width?: PageWidth;
}

const WIDTH_CLASSES: Record<PageWidth, string> = {
  narrow: "max-w-xl",
  default: "max-w-document",
  wide: "max-w-5xl",
};

/** The floating white page surface every document renders on. */
export function DocumentCard({ children, width = "default" }: DocumentCardProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[calc(100dvh-11rem)] w-full flex-col rounded-card border border-border-subtle bg-surface-card px-8 py-10 transition-[max-width] duration-300 sm:px-14 sm:py-12",
        WIDTH_CLASSES[width],
      )}
    >
      {children}
    </div>
  );
}
