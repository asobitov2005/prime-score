"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function GenericSkeleton({ isOverlay }: { isOverlay: boolean }) {
  const skeletonRows = isOverlay ? 3 : 5;

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-2xl border border-border/55 bg-card/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-md",
        isOverlay ? "max-w-md" : "max-w-3xl"
      )}
    >
      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="h-2.5 w-48 max-w-full rounded-full" />
          </div>
          {!isOverlay ? <SkeletonBlock className="hidden h-8 w-24 rounded-full sm:block" /> : null}
        </div>

        <div className={cn("grid gap-3", isOverlay ? "grid-cols-1" : "grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]")}>
          {Array.from({ length: skeletonRows }).map((_, index) => (
            <SkeletonCard key={index} className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-2.5 w-28 rounded-full" />
                <SkeletonBlock className="h-5 w-12 rounded-full" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-full rounded-full" />
                <SkeletonBlock className="h-3 w-[82%] rounded-full" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
