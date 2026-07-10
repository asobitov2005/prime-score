"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[82rem] space-y-5 pb-12">
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-9 w-64 rounded-lg" />
          <SkeletonBlock className="h-4 w-[min(30rem,86vw)] rounded-full" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_340px_210px] xl:items-stretch">
          <SkeletonCard className="min-h-[176px] rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-32 rounded-full" />
                <SkeletonBlock className="h-10 w-32 rounded-lg" />
                <SkeletonLineStack widths={["w-[min(24rem,70vw)]", "w-[min(18rem,60vw)]"]} />
              </div>
              <SkeletonBlock className="h-14 w-14 rounded-2xl" />
            </div>
            <SkeletonBlock className="mt-6 h-3 w-full rounded-full" />
          </SkeletonCard>
          <SkeletonCard className="min-h-[176px] rounded-3xl p-5">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-7 h-16 w-28 rounded-lg" />
            <SkeletonBlock className="mt-4 h-4 w-40 rounded-full" />
          </SkeletonCard>
          <SkeletonCard className="min-h-[176px] rounded-3xl p-5">
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <SkeletonBlock className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                    <SkeletonBlock className="h-3 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[580px_minmax(0,1fr)] xl:items-stretch">
          <SkeletonCard className="min-h-[228px] max-w-[580px] rounded-2xl p-4 md:p-5">
            <SkeletonBlock className="h-5 w-40 rounded-full" />
            <SkeletonBlock className="mt-4 h-8 w-72 max-w-full rounded-lg" />
            <SkeletonLineStack className="mt-3" widths={["w-[min(28rem,82vw)]", "w-[min(18rem,70vw)]"]} />
            <SkeletonBlock className="mt-8 h-9 w-36 rounded-lg" />
          </SkeletonCard>
          <SkeletonCard className="min-h-[176px] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <SkeletonLineStack widths={["w-40", "w-56"]} />
              <SkeletonBlock className="h-11 w-11 rounded-xl" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          </SkeletonCard>
        </div>

        <SkeletonCard className="rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <SkeletonLineStack widths={["w-44", "w-64"]} />
            <SkeletonBlock className="h-9 w-28 rounded-xl" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/45 bg-muted/20 p-4">
                <SkeletonBlock className="h-10 w-10 rounded-xl" />
                <SkeletonBlock className="mt-4 h-5 w-24 rounded-md" />
                <SkeletonBlock className="mt-3 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="h-[300px] rounded-3xl" />

        <SkeletonCard className="rounded-3xl p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="h-11 w-11 rounded-2xl" />
              <SkeletonLineStack widths={["w-44", "w-[min(34rem,80vw)]"]} />
            </div>
            <SkeletonBlock className="h-7 w-28 rounded-full" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
            <SkeletonCard className="rounded-3xl p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between gap-3">
                    <SkeletonBlock className="h-5 w-40 rounded-md" />
                    <SkeletonBlock className="h-5 w-12 rounded-md" />
                  </div>
                  <SkeletonBlock className="mt-2 h-2 w-full rounded-full" />
                </div>
              ))}
            </SkeletonCard>
            <SkeletonCard className="rounded-3xl p-4">
              <div className="grid grid-cols-2 gap-2">
                <SkeletonBlock className="h-20 rounded-2xl" />
                <SkeletonBlock className="h-20 rounded-2xl" />
              </div>
              <SkeletonLineStack className="mt-5" widths={["w-40", "w-52", "w-36"]} lines={3} />
              <SkeletonBlock className="mt-5 h-9 w-full rounded-xl" />
            </SkeletonCard>
          </div>
        </SkeletonCard>

        <section className="grid items-stretch gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <SkeletonBlock className="h-6 w-36 rounded-lg" />
              <SkeletonBlock className="h-4 w-16 rounded-full" />
            </div>
            <SkeletonCard className="overflow-hidden rounded-3xl p-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 border-b border-border/40 p-5 last:border-b-0">
                  <SkeletonBlock className="h-12 w-12 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-48 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-32 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </SkeletonCard>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <SkeletonBlock className="h-6 w-32 rounded-lg" />
              <SkeletonBlock className="h-4 w-16 rounded-full" />
            </div>
            <SkeletonCard className="overflow-hidden rounded-3xl p-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 border-b border-border/40 p-5 last:border-b-0">
                  <SkeletonBlock className="h-11 w-11 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-36 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-9 w-9 rounded-full" />
                </div>
              ))}
            </SkeletonCard>
          </div>
        </section>
      </div>
    </div>
  );
}
