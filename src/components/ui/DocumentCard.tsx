import type { ReactNode } from "react";

interface DocumentCardProps {
  children: ReactNode;
}

/** The floating white page surface every document renders on. */
export function DocumentCard({ children }: DocumentCardProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] w-full max-w-document flex-col rounded-card border border-border-subtle bg-surface-card px-8 py-10 sm:px-14 sm:py-12">
      {children}
    </div>
  );
}
