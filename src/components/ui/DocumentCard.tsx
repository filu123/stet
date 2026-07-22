import type { ReactNode } from "react";

interface DocumentCardProps {
  children: ReactNode;
}

/** The floating white page surface every document renders on (Craft-style). */
export function DocumentCard({ children }: DocumentCardProps) {
  return (
    <div className="mx-auto w-full max-w-document rounded-card border border-border-subtle bg-surface-card px-8 py-10 sm:px-14 sm:py-14">
      {children}
    </div>
  );
}
