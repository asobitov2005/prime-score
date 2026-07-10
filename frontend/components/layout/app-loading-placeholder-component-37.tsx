"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function LoginOverlaySkeleton() {
  return (
    <SkeletonCard className="w-full max-w-sm space-y-5 rounded-3xl p-6">
      <div className="mx-auto space-y-3 text-center">
        <SkeletonBlock className="mx-auto h-12 w-12 rounded-2xl" />
        <SkeletonBlock className="mx-auto h-6 w-44 rounded-lg" />
        <SkeletonBlock className="mx-auto h-3 w-56 rounded-full" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-12 w-full rounded-xl" />
        <SkeletonBlock className="h-12 w-full rounded-xl" />
      </div>
      <SkeletonBlock className="h-11 w-full rounded-xl" />
    </SkeletonCard>
  );
}
