"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function SubscriptionSkeleton() {
  return (
    <div className="-mt-1 space-y-6 pb-10 md:-mt-2">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-44 rounded-lg" />
        <SkeletonBlock className="h-4 w-[min(34rem,88vw)] rounded-full" />
      </div>

      <SkeletonCard className="rounded-[18px] border-orange-200/70 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="h-[52px] w-[52px] shrink-0 rounded-full" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-24 rounded-full" />
              <SkeletonBlock className="h-6 w-40 rounded-md" />
              <SkeletonBlock className="h-4 w-56 rounded-full" />
            </div>
          </div>
          <div className="grid gap-0 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-2 px-3 py-2">
                <SkeletonBlock className="h-8 w-8 rounded-full" />
                <SkeletonBlock className="h-4 w-20 rounded-full" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="h-10 w-full rounded-xl lg:w-32" />
        </div>
      </SkeletonCard>

      <section className="space-y-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-64 rounded-lg" />
          <SkeletonBlock className="h-4 w-[min(30rem,84vw)] rounded-full" />
        </div>
        <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-[1.12fr_repeat(3,minmax(0,1fr))]">
          <SkeletonCard className="min-h-[31rem] rounded-[20px] p-6">
            <SkeletonBlock className="h-7 w-56 rounded-lg" />
            <SkeletonLineStack className="mt-5" lines={3} widths={["w-full", "w-5/6", "w-4/6"]} />
            <div className="mt-7 space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <SkeletonBlock className="h-7 w-7 rounded-full" />
                  <SkeletonBlock className="h-4 w-40 rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} className="flex min-h-[31rem] flex-col rounded-[20px] p-6">
              <SkeletonBlock className="mx-auto h-12 w-12 rounded-full" />
              <SkeletonBlock className="mx-auto mt-6 h-7 w-28 rounded-lg" />
              <SkeletonBlock className="mx-auto mt-3 h-4 w-32 rounded-full" />
              <SkeletonBlock className="mx-auto mt-7 h-8 w-32 rounded-lg" />
              <SkeletonBlock className="mt-7 h-12 w-full rounded-xl" />
              <div className="mt-7 space-y-4 border-t border-border/45 pt-6">
                {Array.from({ length: 3 }).map((_, itemIndex) => (
                  <SkeletonBlock key={itemIndex} className="h-4 w-full rounded-full" />
                ))}
              </div>
            </SkeletonCard>
          ))}
        </div>
      </section>

      <SkeletonCard className="rounded-[18px] p-5">
        <SkeletonBlock className="h-6 w-48 rounded-lg" />
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3">
              <SkeletonBlock className="h-14 w-14 shrink-0 rounded-full" />
              <SkeletonLineStack widths={["w-32", "w-44"]} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="rounded-[18px] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:items-center">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="h-12 w-12 rounded-2xl" />
            <SkeletonLineStack widths={["w-52", "w-64"]} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <SkeletonBlock className="h-12 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-32 rounded-xl" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
