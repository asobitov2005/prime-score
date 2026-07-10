"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { PageHeadingSkeleton } from "./app-loading-placeholder-component-08";

export function WritingHistorySkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeadingSkeleton action />
      <div className="flex flex-wrap items-center gap-2">
        <SkeletonBlock className="h-8 w-20 rounded-full" />
        <SkeletonBlock className="h-8 w-20 rounded-full" />
        <SkeletonBlock className="h-8 w-20 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={index} className="rounded-2xl p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <SkeletonBlock className="h-12 w-12 shrink-0 rounded-2xl" />
                <div className="min-w-0 space-y-2">
                  <SkeletonBlock className="h-4 w-56 max-w-full rounded-md" />
                  <SkeletonBlock className="h-3 w-72 max-w-full rounded-full" />
                </div>
              </div>
              <SkeletonBlock className="h-8 w-24 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
