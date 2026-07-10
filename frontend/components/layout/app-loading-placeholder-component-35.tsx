"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function ReservedSectionSkeleton({ variant = "generic" }: { variant?: "generic" | "speaking" | "articles" } = {}) {
  const isArticles = variant === "articles";
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-6 w-36 rounded-full" />
          <SkeletonBlock className="h-4 w-4 rounded-md" />
        </div>
        <SkeletonBlock className="h-8 w-36 rounded-lg" />
        <SkeletonBlock className="h-4 w-[min(36rem,88vw)] rounded-full" />
      </div>
      <SkeletonCard className="rounded-3xl p-6">
        <SkeletonBlock className="h-11 w-11 rounded-2xl" />
        <SkeletonBlock className="mt-4 h-6 w-40 rounded-lg" />
        <SkeletonLineStack
          className="mt-4"
          lines={isArticles ? 2 : 3}
          widths={isArticles ? ["w-full", "w-2/3"] : ["w-full", "w-5/6", "w-2/3"]}
        />
        {isArticles ? null : (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-10 w-full rounded-xl sm:w-44" />
            <SkeletonBlock className="h-10 w-full rounded-xl sm:w-36" />
          </div>
        )}
      </SkeletonCard>
    </div>
  );
}
