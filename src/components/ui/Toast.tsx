import { cn } from "@/lib/utils/cn";

interface ToastProps {
  message: string;
  isVisible: boolean;
}

/** Small transient notice, bottom-center. Flat pill — no shadow (AGENTS.md). */
export function Toast({ message, isVisible }: ToastProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        "rounded-full border border-border-subtle bg-surface-card px-4 py-2",
        "text-sm text-content-secondary transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      {isVisible && message}
    </div>
  );
}
