"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function AttemptReviewSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard className="p-6">
        <SkeletonBlock className="h-7 w-32 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-[min(36rem,88vw)] rounded-lg" />
        <SkeletonLineStack className="mt-3" widths={["w-[min(42rem,90vw)]", "w-[min(24rem,76vw)]"]} />
        <div className="mt-4 flex flex-wrap gap-3">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-36 rounded-full" />
          <SkeletonBlock className="h-6 w-28 rounded-full" />
        </div>
      </SkeletonCard>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="p-5">
            <div className="flex flex-wrap gap-2">
              <SkeletonBlock className="h-6 w-14 rounded-full" />
              <SkeletonBlock className="h-6 w-20 rounded-full" />
              <SkeletonBlock className="h-6 w-28 rounded-full" />
            </div>
            <SkeletonBlock className="mt-4 h-5 w-4/5 rounded-md" />
            <SkeletonBlock className="mt-2 h-3 w-64 max-w-full rounded-full" />
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-16 w-full rounded-lg" />
              <SkeletonBlock className="h-16 w-full rounded-lg" />
              <SkeletonBlock className="h-20 w-full rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
