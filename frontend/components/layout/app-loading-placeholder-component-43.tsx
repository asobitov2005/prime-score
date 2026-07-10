"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";

export function AdminSidebarLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="h-10 w-full rounded-2xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl px-3 py-3">
            <SkeletonBlock className="h-4 w-4 rounded-md" />
            <SkeletonBlock className={cn("h-3 rounded-full", index % 2 === 0 ? "w-24" : "w-32")} />
          </div>
        ))}
      </div>
    </div>
  );
}
