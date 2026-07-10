"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function StatStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonCard className="p-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex h-20 items-center gap-3 px-3 py-3",
              index > 0 && "xl:border-l xl:border-border/45",
              index > 1 && "sm:border-t sm:border-border/45 xl:border-t-0"
            )}
          >
            <SkeletonBlock className="h-12 w-12 rounded-2xl" />
            <div className="min-w-0 space-y-2">
              <SkeletonBlock className="h-6 w-14 rounded-md" />
              <SkeletonBlock className="h-3 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}
