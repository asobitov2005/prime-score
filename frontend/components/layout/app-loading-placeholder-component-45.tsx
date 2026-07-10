"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { RouteLoadingFrameProps } from "./app-loading-placeholder-component-04";
import { AppLoadingPlaceholder } from "./app-loading-placeholder-component-50";

export function MarketingRouteLoadingFrame({ className }: RouteLoadingFrameProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-12", className)}>
      <AppLoadingPlaceholder className="min-h-[50vh] px-0 py-0" />
    </div>
  );
}
