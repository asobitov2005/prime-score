"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";
import { PageHeadingSkeleton } from "./app-loading-placeholder-component-08";

export function WritingTasksSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeadingSkeleton />
      <SkeletonCard className="rounded-3xl p-4">
        <div className="inline-flex rounded-xl bg-muted/40 p-1 shadow-inner">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
      </SkeletonCard>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="flex min-h-[18rem] flex-col overflow-hidden rounded-3xl p-0">
            <SkeletonBlock className="h-44 w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-16 rounded-full" />
                <SkeletonBlock className="h-4 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-5 w-4/5 rounded-md" />
              <SkeletonLineStack lines={2} widths={["w-full", "w-2/3"]} />
              <div className="mt-auto flex items-center justify-between">
                <SkeletonBlock className="h-4 w-32 rounded-full" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
