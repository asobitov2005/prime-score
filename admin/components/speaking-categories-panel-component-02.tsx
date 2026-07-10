"use client";

import { cn, formatCategoryLabel, getCategoryStyle } from "./speaking-categories-panel-dependencies";

export function CategoryTag({ category, label }: { category: string; label?: string | null }) {
  const style = getCategoryStyle(category);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] shadow-sm",
        style.bg,
        style.text,
        style.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label?.trim() || formatCategoryLabel(category)}
    </span>
  );
}
