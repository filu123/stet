"use client";

import { cn } from "@/lib/utils/cn";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  "aria-label": string;
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Apple-style segmented picker for a small set of mutually exclusive options. */
export function SegmentedControl<T extends string>({
  "aria-label": ariaLabel,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex rounded-lg border border-border-subtle bg-surface-app p-0.5"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1 text-sm transition-colors",
              isSelected
                ? "bg-surface-card font-medium text-content-primary"
                : "text-content-secondary hover:text-content-primary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
