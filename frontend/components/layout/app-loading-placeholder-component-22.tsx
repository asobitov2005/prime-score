"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function BookmarksSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[82rem] pb-10">
      <section className="pt-1">
        <div className="flex items-center gap-1.5">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-3.5 w-3.5 rounded-md" />
          <SkeletonBlock className="h-4 w-20 rounded-full" />
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-9 w-52 rounded-lg" />
            <SkeletonBlock className="h-4 w-[min(34rem,88vw)] rounded-full" />
          </div>
          <SkeletonBlock className="h-10 w-32 rounded-full" />
        </div>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="relative flex min-h-[12.75rem] flex-col rounded-[14px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                </div>
                <SkeletonBlock className="mt-4 h-4 w-48 max-w-full rounded-md" />
                <SkeletonBlock className="mt-2 h-4 w-36 max-w-full rounded-md" />
              </div>
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
            </div>
            <SkeletonBlock className="mt-4 h-3 w-44 rounded-full" />
            <SkeletonBlock className="mt-4 h-3 w-28 rounded-full" />
            <SkeletonBlock className="mt-auto h-10 w-full rounded-lg" />
          </SkeletonCard>
        ))}
      </section>
    </div>
  );
}
