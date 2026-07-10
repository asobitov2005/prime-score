"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { RouteLoadingFrameProps } from "./app-loading-placeholder-component-04";
import { SidebarLoadingSkeleton } from "./app-loading-placeholder-component-42";
import { AppLoadingPlaceholder } from "./app-loading-placeholder-component-50";

export function AppRouteLoadingFrame({
  className,
  sidebar = "open",
}: RouteLoadingFrameProps) {
  return (
    <div className="relative flex w-full flex-1 flex-col items-start gap-5 px-4 pb-6 pt-3 md:gap-6 md:px-6 md:pb-8 md:pt-4 lg:flex-row lg:px-4">
      <aside
        className={cn(
          "sticky top-[calc(var(--app-shell-sticky-top,5rem)+0.5rem)] hidden w-[16rem] shrink-0 transition-all duration-300 lg:block",
          sidebar === "collapsed" ? "lg:hidden" : "lg:block"
        )}
      >
        <SidebarLoadingSkeleton />
      </aside>

      <main className="w-full min-w-0 flex-1">
        <AppLoadingPlaceholder className={cn("min-h-[50vh] px-0 py-0", className)} />
      </main>
    </div>
  );
}
