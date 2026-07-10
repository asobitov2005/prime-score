"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { RouteLoadingFrameProps } from "./app-loading-placeholder-component-04";
import { AdminSidebarLoadingSkeleton } from "./app-loading-placeholder-component-43";
import { AppLoadingPlaceholder } from "./app-loading-placeholder-component-50";

export function AdminRouteLoadingFrame({ className }: RouteLoadingFrameProps) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-72 shrink-0 border-r border-border/50 bg-background/95 p-6 lg:block">
        <AdminSidebarLoadingSkeleton />
      </aside>

      <main className="flex-1 overflow-auto">
        <div className={cn("mx-auto max-w-7xl p-8", className)}>
          <AppLoadingPlaceholder className="min-h-[50vh] px-0 py-0" />
        </div>
      </main>
    </div>
  );
}
