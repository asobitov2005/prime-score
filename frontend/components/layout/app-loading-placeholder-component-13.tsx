"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { TestCatalogCardSkeleton } from "./app-loading-placeholder-component-12";

export function SkillTestsSkeleton({ skill = "reading" }: { skill?: "reading" | "listening" }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-[82rem] pb-10">
        <section className="pt-1">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="h-3.5 w-3.5 rounded-md" />
              <SkeletonBlock className={cn("h-4 rounded-full", skill === "listening" ? "w-20" : "w-16")} />
            </div>
            <SkeletonBlock className="mt-4 h-9 w-64 rounded-lg" />
            {skill === "listening" ? <SkeletonBlock className="mt-3 h-5 w-[min(34rem,88vw)] rounded-full" /> : null}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} className="flex min-h-[6.25rem] items-center gap-4 rounded-[14px] p-4">
              <SkeletonBlock className="h-[4.25rem] w-[3.2rem] shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-36 max-w-full rounded-md" />
                <SkeletonBlock className="h-4 w-24 rounded-full" />
              </div>
              <SkeletonBlock className="h-4 w-4 rounded-md" />
            </SkeletonCard>
          ))}
        </section>

        <section className="mt-8 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="flex min-w-0 items-end gap-6 overflow-hidden border-b border-slate-200 dark:border-slate-800">
            {(skill === "listening" ? [72, 72, 72, 72, 72] : [72, 96, 72, 72, 72]).map((width, index) => (
              <SkeletonBlock key={index} className="h-10 shrink-0 rounded-t-md" style={{ width }} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[31rem]">
            <SkeletonBlock className="h-10 w-full rounded-xl" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
          </div>
        </section>

        <TestCatalogCardSkeleton />
      </div>
    </div>
  );
}
