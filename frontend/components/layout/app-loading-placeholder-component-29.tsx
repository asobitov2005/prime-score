"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function AttemptResultSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-[min(36rem,88vw)] rounded-lg" />
          <SkeletonBlock className="h-4 w-72 max-w-full rounded-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-32 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)]">
        <SkeletonCard className="min-h-[22rem] rounded-3xl p-5">
          <SkeletonBlock className="mx-auto h-44 w-44 rounded-full" />
          <SkeletonBlock className="mx-auto mt-6 h-8 w-24 rounded-lg" />
          <SkeletonBlock className="mx-auto mt-3 h-4 w-40 rounded-full" />
        </SkeletonCard>
        <SkeletonCard className="min-h-[22rem] rounded-3xl p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/45 bg-muted/20 p-4">
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <SkeletonBlock className="mt-3 h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
      <SkeletonCard className="h-40 rounded-3xl" />
      <SkeletonCard className="h-64 rounded-3xl" />
    </div>
  );
}
