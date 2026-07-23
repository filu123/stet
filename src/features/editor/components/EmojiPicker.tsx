"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

import { EMOJI_CATEGORIES } from "../lib/emoji-data";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

/** Tabbed grid of unicode emojis; selecting one inserts it at the cursor. */
export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [categoryId, setCategoryId] = useState(EMOJI_CATEGORIES[0].id);
  const activeCategory =
    EMOJI_CATEGORIES.find((category) => category.id === categoryId) ?? EMOJI_CATEGORIES[0];

  return (
    <div className="flex w-64 flex-col gap-2">
      <div className="flex items-center justify-between gap-0.5">
        {EMOJI_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-label={category.label}
            title={category.label}
            onClick={() => setCategoryId(category.id)}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg text-base transition-colors",
              category.id === categoryId ? "bg-surface-hover" : "hover:bg-surface-hover",
            )}
          >
            {category.icon}
          </button>
        ))}
      </div>

      <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
        {activeCategory.emojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className="flex size-7 items-center justify-center rounded-lg text-lg transition-colors hover:bg-surface-hover"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
