"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";

export function PageHeadingSkeleton({
  action = false,
  compact = false,
}: {
  action?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className={cn("space-y-3", compact && "space-y-2")}>
        <SkeletonBlock className="h-6 w-28 rounded-full" />
        <SkeletonBlock className={cn("rounded-lg", compact ? "h-7 w-48" : "h-9 w-64")} />
        <SkeletonBlock className="h-4 w-[min(34rem,88vw)] rounded-full" />
      </div>
      {action ? <SkeletonBlock className="h-11 w-36 rounded-2xl" /> : null}
    </div>
  );
}
