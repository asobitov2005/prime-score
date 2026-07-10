"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function TestCatalogCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} className="flex min-h-[11rem] flex-col rounded-[14px] p-4">
          <div className="min-h-[2.5rem] min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-44 max-w-full rounded-md" />
                <SkeletonBlock className="h-4 w-28 max-w-full rounded-md" />
              </div>
              <SkeletonBlock className="h-6 w-16 shrink-0 rounded-full" />
            </div>
            <div className="mt-1 flex min-h-8 items-center justify-between gap-2">
              <SkeletonBlock className="h-4 w-28 rounded-full" />
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="mt-auto h-10 w-full rounded-lg" />
        </SkeletonCard>
      ))}
    </section>
  );
}
