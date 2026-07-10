"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";
import { PageHeadingSkeleton } from "./app-loading-placeholder-component-08";

export function MarketingSkeleton({ variant = "landing" }: { variant?: "landing" | "pricing" | "reviews" | "seo" }) {
  if (variant === "pricing") {
    return (
      <div className="relative mx-auto w-full max-w-7xl space-y-16">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-8">
            <SkeletonBlock className="h-8 w-56 rounded-full" />
            <div className="space-y-4">
              <SkeletonBlock className="h-12 w-[min(34rem,90vw)] rounded-lg" />
              <SkeletonBlock className="h-12 w-[min(26rem,76vw)] rounded-lg" />
              <SkeletonLineStack widths={["w-[min(32rem,84vw)]", "w-[min(24rem,72vw)]"]} />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <SkeletonBlock className="h-14 w-full rounded-2xl sm:w-40" />
              <SkeletonBlock className="h-14 w-full rounded-2xl sm:w-44" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-4">
            <SkeletonCard className="h-36 rounded-[2rem]" />
            <SkeletonCard className="h-36 rounded-[2rem]" />
            <SkeletonCard className="h-36 rounded-[2rem]" />
          </div>
        </section>
        <section className="space-y-8 border-t border-border/30 pt-16">
          <SkeletonBlock className="h-8 w-44 rounded-full" />
          <SkeletonBlock className="h-12 w-[min(42rem,90vw)] rounded-lg" />
          <div className="grid gap-5 md:grid-cols-3">
            <SkeletonCard className="h-96 rounded-[2rem]" />
            <SkeletonCard className="h-96 rounded-[2rem]" />
            <SkeletonCard className="h-96 rounded-[2rem]" />
          </div>
        </section>
      </div>
    );
  }

  if (variant === "reviews") {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <PageHeadingSkeleton action />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <SkeletonCard key={index} className="min-h-[12rem] rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-11 w-11 rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-32 rounded-md" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
              </div>
              <SkeletonLineStack className="mt-5" lines={3} widths={["w-full", "w-11/12", "w-3/4"]} />
            </SkeletonCard>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "seo") {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-5">
            <SkeletonBlock className="h-7 w-44 rounded-full" />
            <SkeletonBlock className="h-12 w-[min(36rem,88vw)] rounded-lg" />
            <SkeletonBlock className="h-12 w-[min(28rem,76vw)] rounded-lg" />
            <SkeletonLineStack widths={["w-[min(36rem,88vw)]", "w-[min(30rem,80vw)]"]} />
            <div className="flex gap-3">
              <SkeletonBlock className="h-12 w-36 rounded-xl" />
              <SkeletonBlock className="h-12 w-32 rounded-xl" />
            </div>
          </div>
          <SkeletonBlock className="h-80 w-full rounded-[2rem]" />
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard className="h-44 rounded-2xl" />
          <SkeletonCard className="h-44 rounded-2xl" />
          <SkeletonCard className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-4">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="h-10 w-[92%] rounded-lg" />
          <SkeletonBlock className="h-10 w-[74%] rounded-lg" />
          <div className="space-y-2 pt-1">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-[84%]" />
          </div>
          <div className="flex gap-3 pt-2">
            <SkeletonBlock className="h-11 w-32 rounded-xl" />
            <SkeletonBlock className="h-11 w-28 rounded-xl" />
          </div>
        </div>
        <SkeletonBlock className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}
