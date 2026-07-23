import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { DocumentFont, EditorFontSize, PageLayout, PageWidth, PaperSize } from "@/types/ui";

interface DocumentCardProps {
  children: ReactNode;
  width?: PageWidth;
  /** Custom width in px — used when width === "free". */
  freeWidth?: number;
  layout?: PageLayout;
  paper?: PaperSize;
  fontSize?: EditorFontSize;
  fontFamily?: DocumentFont;
}

const WIDTH_CLASSES: Record<Exclude<PageWidth, "free">, string> = {
  default: "max-w-document",
  wide: "max-w-5xl",
};

/** The floating white page surface every document renders on. */
export function DocumentCard({
  children,
  width = "default",
  freeWidth,
  layout = "continuous",
  paper = "a4",
  fontSize = "default",
  fontFamily = "sans",
}: DocumentCardProps) {
  const isFree = width === "free";
  return (
    <div
      data-layout={layout}
      data-paper={paper}
      data-font-size={fontSize}
      data-font-family={fontFamily}
      style={isFree && freeWidth ? { maxWidth: `${freeWidth}px` } : undefined}
      className={cn(
        "document-card relative mx-auto flex min-h-[calc(100dvh-11rem)] w-full flex-col rounded-card border border-border-subtle bg-surface-card px-8 py-10 sm:px-14 sm:py-12",
        // No width transition in free mode — it would fight the drag.
        isFree ? undefined : `transition-[max-width] duration-300 ${WIDTH_CLASSES[width]}`,
      )}
    >
      {children}
    </div>
  );
}
