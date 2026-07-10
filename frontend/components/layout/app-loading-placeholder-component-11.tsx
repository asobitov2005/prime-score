"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";
import { StatStripSkeleton } from "./app-loading-placeholder-component-09";

export function TestsOverviewSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-[82rem] flex-col gap-4 pb-10">
        <section className="-mb-2 -mt-4 px-6 pb-0 pt-1 sm:-mt-5 sm:px-7 sm:pb-0 sm:pt-0 lg:-mb-3">
          <div className="flex translate-y-2 items-start justify-between gap-6 sm:translate-y-3">
            <div className="max-w-2xl space-y-3 pt-4">
              <SkeletonBlock className="h-8 w-56 rounded-lg md:h-9" />
              <SkeletonBlock className="h-5 w-[min(34rem,86vw)] rounded-full" />
            </div>
            <SkeletonBlock className="hidden h-36 w-64 shrink-0 rounded-2xl lg:block" />
          </div>
        </section>

        <StatStripSkeleton count={5} />

        <SkeletonCard className="rounded-2xl p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
              <SkeletonBlock className="h-[4.25rem] w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <SkeletonBlock className="h-5 w-80 max-w-full rounded-md" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <SkeletonBlock className="h-4 w-36 rounded-full" />
                  <SkeletonBlock className="h-4 w-44 rounded-full" />
                </div>
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            </div>
            <SkeletonBlock className="h-11 w-full rounded-xl xl:w-36" />
          </div>
        </SkeletonCard>

        <section className="space-y-4">
          <SkeletonBlock className="h-7 w-40 rounded-lg" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonCard key={index} className="flex min-h-[12.5rem] flex-col rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-12 w-12 rounded-2xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-5 w-24 rounded-md" />
                    <SkeletonBlock className="h-4 w-20 rounded-full" />
                  </div>
                </div>
                <SkeletonLineStack className="mt-4" widths={["w-full", "w-3/4"]} />
                <SkeletonBlock className="mt-auto h-10 w-full rounded-xl" />
              </SkeletonCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SkeletonBlock className="h-7 w-48 rounded-lg" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCard key={index} className="flex h-[6.5rem] items-center gap-4 rounded-2xl p-5">
                <SkeletonBlock className="h-[4.5rem] w-[3.375rem] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-44 max-w-full rounded-md" />
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                </div>
                <SkeletonBlock className="h-5 w-5 rounded-md" />
              </SkeletonCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-36 rounded-lg" />
              <SkeletonBlock className="h-3 w-64 rounded-full" />
            </div>
            <SkeletonBlock className="h-10 w-48 rounded-full" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15.75rem),1fr))] gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} className="flex min-h-[12.75rem] flex-col rounded-[14px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-36 rounded-md" />
                    <SkeletonBlock className="h-4 w-28 rounded-md" />
                  </div>
                  <SkeletonBlock className="h-9 w-9 rounded-xl" />
                </div>
                <SkeletonBlock className="mt-3 h-3 w-40 rounded-full" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                </div>
                <SkeletonBlock className="mt-auto h-10 w-full rounded-lg" />
              </SkeletonCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
