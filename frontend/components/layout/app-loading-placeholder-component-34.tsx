"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function AchievementsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-44 rounded-lg" />
        <SkeletonBlock className="h-4 w-[min(42rem,90vw)] rounded-full" />
      </div>
      <SkeletonCard className="rounded-[18px] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
            <SkeletonBlock className="h-[76px] w-[70px] shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-3 w-28 rounded-full" />
              <div className="mt-2 max-w-[360px]">
                <div className="flex items-end justify-between gap-4">
                  <SkeletonBlock className="h-8 w-28 rounded-lg" />
                  <div className="space-y-2">
                    <SkeletonBlock className="h-5 w-20 rounded-md" />
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                  </div>
                </div>
                <SkeletonBlock className="mt-3 h-3 w-full rounded-full" />
              </div>
            </div>
          </div>
          <div className="hidden h-[60px] w-px shrink-0 bg-border/60 lg:block" />
          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center xl:gap-8">
            <div className="flex items-center gap-3 rounded-2xl border border-border/45 p-4 xl:border-0 xl:p-0">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <SkeletonLineStack widths={["w-24", "w-28"]} />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/45 p-4 xl:border-0 xl:p-0">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <SkeletonLineStack widths={["w-10", "w-32"]} />
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-border/45 p-4 sm:col-span-2 xl:border-0 xl:p-0">
              <SkeletonBlock className="h-[76px] w-[96px] rounded-2xl" />
              <SkeletonLineStack widths={["w-28", "w-36"]} />
            </div>
          </div>
        </div>
      </SkeletonCard>
      {["w-44", "w-48", "w-40"].map((titleWidth, rowIndex) => (
        <section key={rowIndex} className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className={cn("h-6 rounded-lg", titleWidth)} />
            <div className="flex gap-2">
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
            </div>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonCard key={index} className="w-[200px] flex-none rounded-2xl p-3">
                <SkeletonBlock className="mx-auto h-16 w-28 rounded-2xl" />
                <SkeletonBlock className="mx-auto mt-4 h-4 w-32 rounded-md" />
                <SkeletonLineStack className="mt-3" widths={["w-full", "w-3/4"]} />
                <SkeletonBlock className="mt-5 h-8 w-full rounded-md" />
              </SkeletonCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
