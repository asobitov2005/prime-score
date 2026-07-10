"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";

export function SkeletonLineStack({
  lines = 2,
  className,
  widths = ["w-48", "w-64"],
}: {
  lines?: number;
  className?: string;
  widths?: string[];
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className={cn(
            "h-3 max-w-full rounded-full",
            widths[index] ?? widths[widths.length - 1] ?? "w-full"
          )}
        />
      ))}
    </div>
  );
}
