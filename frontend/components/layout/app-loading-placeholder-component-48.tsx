"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { RouteLoadingFrameProps } from "./app-loading-placeholder-component-04";
import { AppLoadingPlaceholder } from "./app-loading-placeholder-component-50";

export function ExamRouteLoadingFrame({ className }: RouteLoadingFrameProps) {
  return (
    <div className={cn("fixed inset-0 z-[130] bg-background", className)}>
      <AppLoadingPlaceholder className="h-full min-h-dvh items-stretch justify-start px-0 py-0" />
    </div>
  );
}
