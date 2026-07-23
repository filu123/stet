"use client";

import { useEffect } from "react";

import { RotateCcw } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Route-level boundary: a calm recovery screen instead of a white page. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Route error:", error.message);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-app px-6 text-center">
      <div>
        <h1 className="text-lg font-semibold text-content-primary">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-content-secondary">
          The page hit an unexpected error. Your documents are saved on disk — nothing is lost.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Try again
        </button>
        <Link
          href="/"
          className="flex h-9 items-center rounded-lg border border-border-subtle bg-surface-card px-3 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
