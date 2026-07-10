"use client";

import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { PageHeadingSkeleton } from "./app-loading-placeholder-component-08";

export function AdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeadingSkeleton compact />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <SkeletonCard className="h-72 rounded-2xl" />
    </div>
  );
}
