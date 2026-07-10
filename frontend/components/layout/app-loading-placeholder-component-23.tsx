"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { TableSkeleton } from "./app-loading-placeholder-component-10";

export function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <SkeletonCard className="relative overflow-hidden rounded-3xl p-5 lg:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-muted/70" />
        <div className="flex items-start justify-between gap-4">
          <SkeletonBlock className="h-8 w-48 rounded-lg" />
          <SkeletonBlock className="hidden h-12 w-12 shrink-0 rounded-2xl md:block" />
        </div>
        <div className="mt-4 flex w-full items-center overflow-hidden rounded-[1.25rem] border border-border/50 bg-muted/40 p-1.5 md:w-max">
          {[92, 82, 88].map((width, index) => (
            <SkeletonBlock key={index} className="h-10 rounded-xl" style={{ width }} />
          ))}
        </div>
      </SkeletonCard>
      <TableSkeleton rows={8} />
    </div>
  );
}
