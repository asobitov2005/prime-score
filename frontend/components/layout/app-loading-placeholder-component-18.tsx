"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function WritingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-56 rounded-lg" />
          <SkeletonBlock className="h-4 w-[min(38rem,88vw)] rounded-full" />
        </div>
        <SkeletonBlock className="h-11 w-36 rounded-xl" />
      </div>

      <SkeletonCard className="overflow-hidden rounded-[18px] p-0">
        <div className="px-6 pb-3 pt-6 md:px-8 md:pb-4 md:pt-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex gap-4 sm:items-center">
              <SkeletonBlock className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 space-y-3">
                <SkeletonBlock className="h-7 w-52 rounded-lg" />
                <SkeletonLineStack widths={["w-[min(34rem,78vw)]", "w-[min(24rem,68vw)]"]} />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <SkeletonBlock className="h-11 w-full rounded-xl sm:w-36" />
              <SkeletonBlock className="h-11 w-full rounded-xl sm:w-32" />
              <SkeletonBlock className="h-11 w-full rounded-xl sm:w-36" />
            </div>
          </div>
          <div className="-mx-6 mt-6 flex flex-col gap-2 border-t border-border/45 px-6 pt-3 sm:flex-row sm:items-center sm:justify-between md:-mx-8 md:px-8">
            <SkeletonBlock className="h-4 w-64 rounded-full" />
            <SkeletonBlock className="h-4 w-48 rounded-full" />
          </div>
        </div>
      </SkeletonCard>

      <SkeletonCard className="rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SkeletonBlock className="h-5 w-48 rounded-md" />
          <SkeletonBlock className="h-4 w-36 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-border/45 bg-muted/20 p-3 lg:border-0">
              <SkeletonBlock className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-16 rounded-md" />
                <SkeletonBlock className="h-3 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="rounded-3xl p-4">
        <div className="inline-flex rounded-xl bg-muted/40 p-1 shadow-inner">
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <SkeletonBlock className="h-11 w-full rounded-xl" />
          <SkeletonBlock className="h-11 w-36 rounded-xl" />
        </div>
      </SkeletonCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="flex min-h-[18rem] flex-col overflow-hidden rounded-3xl p-0">
            <SkeletonBlock className="h-40 w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-16 rounded-full" />
                <SkeletonBlock className="h-4 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-5 w-4/5 rounded-md" />
              <SkeletonLineStack lines={2} widths={["w-full", "w-2/3"]} />
              <SkeletonBlock className="mt-auto h-10 w-full rounded-xl" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
