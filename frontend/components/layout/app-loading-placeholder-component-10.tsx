"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function TableSkeleton({
  rows = 5,
  columns = "grid-cols-[48px_minmax(0,1.4fr)_88px_78px] md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px]",
}: {
  rows?: number;
  columns?: string;
}) {
  return (
    <SkeletonCard className="overflow-hidden p-0">
      <div className={cn("grid gap-3 border-b border-border/50 bg-muted/20 px-4 py-4 md:px-6", columns)}>
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className={cn("h-3 rounded-full", index > 3 && "hidden md:block")} />
        ))}
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={cn("grid items-center gap-3 px-4 py-4 md:px-6", columns)}>
            <SkeletonBlock className="h-5 w-7 rounded-md justify-self-center" />
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-44 max-w-full rounded-full" />
                <SkeletonBlock className="h-3 w-32 max-w-full rounded-full" />
              </div>
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-md justify-self-end md:justify-self-center" />
            <SkeletonBlock className="h-7 w-16 rounded-full justify-self-end md:justify-self-center" />
            <SkeletonBlock className="hidden h-5 w-12 rounded-md justify-self-center md:block" />
            <SkeletonBlock className="hidden h-10 w-16 rounded-xl justify-self-center md:block" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}
