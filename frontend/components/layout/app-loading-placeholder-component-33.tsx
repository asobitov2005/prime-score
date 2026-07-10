"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function AnalyticsSkeleton({ variant = "overview" }: { variant?: "overview" | "skill" } = {}) {
  if (variant === "skill") {
    return (
      <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
        <main className="space-y-5">
          <SkeletonBlock className="h-5 w-36 rounded-full" />

          <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <SkeletonBlock className="h-16 w-16 shrink-0 rounded-[14px]" />
              <div className="space-y-3">
                <SkeletonBlock className="h-9 w-72 max-w-full rounded-lg" />
                <SkeletonBlock className="h-5 w-[min(34rem,82vw)] rounded-full" />
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
            <SkeletonCard className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <div className="grid h-full gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
                <div>
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                  <SkeletonBlock className="mt-4 h-14 w-24 rounded-lg" />
                  <SkeletonBlock className="mt-4 h-7 w-28 rounded-full" />
                  <SkeletonBlock className="mt-3 h-4 w-36 rounded-full" />
                </div>
                <div className="flex h-[150px] items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  {[68, 86, 58, 96, 72, 104, 80].map((height, index) => (
                    <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height }} />
                  ))}
                </div>
              </div>
            </SkeletonCard>

            <SkeletonCard className="min-h-[190px] overflow-hidden rounded-[18px] border-[#E5E7EB] bg-white p-0 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <div className="grid h-full sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={cn("p-5", index > 0 && "border-t border-slate-100 sm:border-l sm:border-t-0")}>
                    <SkeletonBlock className="h-10 w-10 rounded-xl" />
                    <SkeletonBlock className="mt-4 h-3 w-28 rounded-full" />
                    <SkeletonBlock className="mt-3 h-7 w-20 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-3 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
            <SkeletonCard className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <SkeletonBlock className="h-5 w-40 rounded-md" />
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, cardIndex) => (
                  <div key={cardIndex} className="rounded-2xl bg-slate-50 p-4">
                    <SkeletonBlock className="h-5 w-28 rounded-md" />
                    <div className="mt-5 space-y-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index}>
                          <SkeletonBlock className="h-4 w-40 max-w-full rounded-md" />
                          <SkeletonBlock className="mt-2 h-2 w-full rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>

            <SkeletonCard className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <SkeletonBlock className="h-5 w-40 rounded-md" />
              <div className="mt-4 flex h-[310px] items-end gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                {[72, 118, 92, 134, 98, 150, 126].map((height, index) => (
                  <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height }} />
                ))}
              </div>
              <div className="mt-3 flex justify-center gap-5">
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <SkeletonBlock className="h-3 w-24 rounded-full" />
              </div>
            </SkeletonCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
            <SkeletonCard className="overflow-hidden rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <SkeletonBlock className="h-5 w-48 rounded-md" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] gap-6 bg-slate-50 px-5 py-3.5">
                  <SkeletonBlock className="h-3 w-24 rounded-full" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                  <SkeletonBlock className="h-3 w-16 justify-self-end rounded-full" />
                </div>
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] items-center gap-6 px-5 py-5">
                      <SkeletonBlock className="h-4 w-44 max-w-full rounded-md" />
                      <div className="flex items-center gap-4">
                        <SkeletonBlock className="h-4 w-12 rounded-md" />
                        <SkeletonBlock className="h-2.5 flex-1 rounded-full" />
                      </div>
                      <SkeletonBlock className="h-4 w-10 justify-self-end rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonCard>

            <div className="grid gap-4">
              {Array.from({ length: 2 }).map((_, cardIndex) => (
                <SkeletonCard key={cardIndex} className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
                  <SkeletonBlock className="h-5 w-44 rounded-md" />
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <SkeletonBlock className="h-4 w-40 max-w-full rounded-md" />
                          <SkeletonBlock className="h-3 w-52 max-w-full rounded-full" />
                        </div>
                        <SkeletonBlock className="h-4 w-16 rounded-md" />
                      </div>
                    ))}
                  </div>
                </SkeletonCard>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="analytics-night analytics-overview -mx-1 space-y-5 bg-[#F8FAFC] pb-10 text-slate-950 sm:mx-0">
      <div>
        <SkeletonBlock className="h-9 w-72 max-w-full rounded-lg" />
        <SkeletonBlock className="mt-3 h-5 w-[min(34rem,86vw)] rounded-full" />
      </div>

      <SkeletonCard className="overflow-hidden rounded-[1.125rem] border-slate-200 bg-white p-0 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.42)]">
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={cn("relative min-h-[150px] p-5", index > 0 && "border-t border-slate-100 sm:border-l sm:border-t-0")}>
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-xl" />
                <SkeletonBlock className="h-4 w-28 rounded-md" />
              </div>
              <div className="ml-[52px] mt-3 space-y-3">
                <SkeletonBlock className="h-8 w-24 rounded-lg" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <SkeletonBlock className="h-4 w-20 rounded-md" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <SkeletonBlock className="h-6 w-44 rounded-md" />
          <SkeletonBlock className="mt-2 h-4 w-72 max-w-full rounded-full" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex min-h-[258px] flex-col justify-between rounded-[1.1rem] border border-slate-100 bg-white p-3.5 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-9 w-9 rounded-xl" />
                    <SkeletonBlock className="h-5 w-24 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-9 w-14 rounded-lg" />
                    <SkeletonBlock className="h-6 w-24 rounded-full" />
                  </div>
                  <div className="flex h-11 items-end gap-2">
                    {[18, 28, 22, 34, 30].map((height, barIndex) => (
                      <SkeletonBlock key={barIndex} className="flex-1 rounded-t-md" style={{ height }} />
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <SkeletonLineStack widths={["w-16", "w-10"]} />
                    <SkeletonLineStack widths={["w-14", "w-8"]} />
                  </div>
                </div>
                <SkeletonBlock className="mt-2 h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-0 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <div className="p-5 pb-0">
            <SkeletonBlock className="h-6 w-40 rounded-md" />
            <SkeletonBlock className="mt-2 h-4 w-28 rounded-full" />
          </div>
          <div className="mx-[5px] mb-5 mt-4 flex h-[306px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/60">
            <SkeletonBlock className="h-56 w-56 rounded-full" />
          </div>
        </SkeletonCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <SkeletonBlock className="h-6 w-40 rounded-md" />
            <SkeletonBlock className="h-9 w-28 rounded-xl" />
          </div>
          <div className="mt-4 flex h-[286px] items-end gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            {[68, 110, 92, 132, 98, 150, 126, 166].map((height, index) => (
              <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height }} />
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between gap-3">
            <SkeletonBlock className="h-6 w-36 rounded-md" />
            <SkeletonBlock className="h-4 w-16 rounded-full" />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 space-y-2">
                    <SkeletonBlock className="h-4 w-36 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                  </div>
                </div>
                <div className="shrink-0 space-y-2 text-right">
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                  <SkeletonBlock className="h-3 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
