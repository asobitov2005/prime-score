"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function WritingResultSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SkeletonCard className="rounded-3xl p-8 sm:p-10">
        <div className="mb-2 flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-2xl" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>
        <SkeletonBlock className="h-9 w-64 rounded-lg" />
        <SkeletonLineStack className="mt-3" widths={["w-[min(42rem,90vw)]", "w-[min(28rem,80vw)]"]} />
        <div className="mt-8 grid grid-cols-1 gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl border border-border/45 bg-muted/20 px-4 py-3">
              <SkeletonBlock className="h-8 w-8 rounded-xl" />
              <SkeletonBlock className="h-4 w-48 max-w-full rounded-md" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="h-28 rounded-3xl" />
    </div>
  );
}
