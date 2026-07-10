"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function TestDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <SkeletonBlock className="h-9 w-32 rounded-xl" />
      <SkeletonCard className="relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-muted/70" />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-5 w-16 rounded-md" />
            <SkeletonBlock className="h-5 w-20 rounded-md" />
            <SkeletonBlock className="h-5 w-20 rounded-md" />
          </div>
          <SkeletonBlock className="h-8 w-[min(34rem,86vw)] rounded-lg" />
          <SkeletonLineStack lines={2} widths={["w-[min(42rem,90vw)]", "w-[min(28rem,78vw)]"]} />
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <SkeletonBlock className="h-11 w-full rounded-xl sm:w-40" />
            <SkeletonBlock className="h-11 w-full rounded-xl sm:w-36" />
          </div>
        </div>
      </SkeletonCard>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="p-4">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <SkeletonBlock className="mt-3 h-3 w-20 rounded-full" />
            <SkeletonBlock className="mt-2 h-6 w-24 rounded-md" />
          </SkeletonCard>
        ))}
      </div>

      <SkeletonCard className="overflow-hidden p-0">
        <div className="border-b border-border/40 bg-muted/10 p-5">
          <SkeletonBlock className="h-5 w-36 rounded-md" />
        </div>
        <div className="space-y-2 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-xl border border-border/55 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-52 max-w-full rounded-md" />
                <SkeletonBlock className="h-3 w-72 max-w-full rounded-full" />
              </div>
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
