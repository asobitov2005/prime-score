"use client";

import { usePathname } from "./app-loading-placeholder-dependencies";
import { RouteLoadingFrameProps } from "./app-loading-placeholder-component-04";
import { resolveLoadingSection } from "./app-loading-placeholder-component-41";
import { AppRouteLoadingFrame } from "./app-loading-placeholder-component-44";
import { MarketingRouteLoadingFrame } from "./app-loading-placeholder-component-45";
import { GenericRouteLoadingFrame } from "./app-loading-placeholder-component-46";
import { AdminRouteLoadingFrame } from "./app-loading-placeholder-component-47";
import { ExamRouteLoadingFrame } from "./app-loading-placeholder-component-48";

export function FrontendRouteLoadingFrame({
  className,
  sidebar = "open",
}: RouteLoadingFrameProps) {
  const pathname = usePathname() ?? "";
  const section = resolveLoadingSection(pathname);

  if (section === "app") {
    return <AppRouteLoadingFrame className={className} sidebar={sidebar} />;
  }

  if (section === "marketing") {
    return <MarketingRouteLoadingFrame className={className} />;
  }

  if (section === "admin") {
    return <AdminRouteLoadingFrame className={className} />;
  }

  if (section === "exam") {
    return <ExamRouteLoadingFrame className={className} />;
  }

  return <GenericRouteLoadingFrame className={className} />;
}
