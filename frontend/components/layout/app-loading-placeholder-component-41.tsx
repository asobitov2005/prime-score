"use client";

import { FrontendLoadingSection } from "./app-loading-placeholder-component-03";

export function resolveLoadingSection(pathname: string): FrontendLoadingSection {
  if (pathname.startsWith("/exam-preview")) {
    return "exam";
  }

  if (
    pathname.startsWith("/dashboard")
    || pathname.startsWith("/tests")
    || pathname.startsWith("/attempts")
    || pathname.startsWith("/history")
    || pathname.startsWith("/bookmarks")
    || pathname.startsWith("/leaderboard")
    || pathname.startsWith("/achievements")
    || pathname.startsWith("/rewards")
    || pathname.startsWith("/analytics")
    || pathname.startsWith("/subscription")
    || pathname.startsWith("/settings")
    || pathname.startsWith("/writing")
    || pathname.startsWith("/speaking")
    || pathname.startsWith("/articles")
  ) {
    return "app";
  }

  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (
    pathname === "/"
    || pathname.startsWith("/login")
  ) {
    return "marketing";
  }

  return "generic";
}
