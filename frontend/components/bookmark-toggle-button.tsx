"use client";

import { Bookmark } from "lucide-react";

import { cn } from "@/lib/utils";
import { useBookmarksStore } from "@/store/bookmarks-store";

/**
 * Minimal shape a bookmark target needs. Callers pass richer test objects;
 * structural typing accepts the extra fields.
 */
interface BookmarkTarget {
  id: string;
  title: string;
}

interface BookmarkToggleButtonProps {
  item: BookmarkTarget;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
}

export function BookmarkToggleButton({
  item,
  className,
  iconClassName,
  showLabel = false,
}: BookmarkToggleButtonProps) {
  const isSaved = useBookmarksStore((state) => Boolean(state.entries[item.id]));
  const toggleBookmark = useBookmarksStore((state) => state.toggleBookmark);

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove bookmark for ${item.title}` : `Bookmark ${item.title}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleBookmark(item.id);
      }}
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border text-sm font-semibold shadow-none transition-colors",
        isSaved
          ? "border-orange-200 bg-orange-50 text-orange-600 hover:border-orange-300 hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
          : "border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-orange-500 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-orange-300",
        showLabel ? "px-3" : "w-10",
        className,
      )}
    >
      <Bookmark className={cn("h-5 w-5", isSaved && "fill-current", iconClassName)} />
      {showLabel ? <span>{isSaved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
