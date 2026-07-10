"use client";

import { TestsOverviewSkeleton } from "./app-loading-placeholder-component-11";
import { ReadingTestsSkeleton } from "./app-loading-placeholder-component-14";
import { ListeningTestsSkeleton } from "./app-loading-placeholder-component-15";
import { DashboardSkeleton } from "./app-loading-placeholder-component-16";
import { HistorySkeleton } from "./app-loading-placeholder-component-17";
import { WritingSkeleton } from "./app-loading-placeholder-component-18";
import { TestDetailSkeleton } from "./app-loading-placeholder-component-20";
import { TestStartSkeleton } from "./app-loading-placeholder-component-21";
import { BookmarksSkeleton } from "./app-loading-placeholder-component-22";
import { LeaderboardSkeleton } from "./app-loading-placeholder-component-23";
import { SubscriptionSkeleton } from "./app-loading-placeholder-component-24";
import { SettingsSkeleton } from "./app-loading-placeholder-component-25";
import { WritingTasksSkeleton } from "./app-loading-placeholder-component-26";
import { WritingHistorySkeleton } from "./app-loading-placeholder-component-27";
import { WritingResultSkeleton } from "./app-loading-placeholder-component-28";
import { AttemptResultSkeleton } from "./app-loading-placeholder-component-29";
import { AttemptReviewSkeleton } from "./app-loading-placeholder-component-30";
import { RedirectSkeleton } from "./app-loading-placeholder-component-31";
import { ExamWorkspaceSkeleton } from "./app-loading-placeholder-component-32";
import { AnalyticsSkeleton } from "./app-loading-placeholder-component-33";
import { AchievementsSkeleton } from "./app-loading-placeholder-component-34";
import { ReservedSectionSkeleton } from "./app-loading-placeholder-component-35";
import { AdminPanelSkeleton } from "./app-loading-placeholder-component-36";
import { LoginOverlaySkeleton } from "./app-loading-placeholder-component-37";
import { MarketingSkeleton } from "./app-loading-placeholder-component-38";
import { GenericSkeleton } from "./app-loading-placeholder-component-39";

export function skeletonForPath(
  pathname: string,
  isOverlay: boolean,
  searchParams: { get(name: string): string | null } | null
) {
  if (isOverlay) {
    if (pathname.startsWith("/login") || pathname.startsWith("/telegram")) {
      return <LoginOverlaySkeleton />;
    }
    return <GenericSkeleton isOverlay />;
  }

  if (pathname.startsWith("/exam-preview/writing")) {
    return <ExamWorkspaceSkeleton kind="writing" />;
  }
  if (pathname.startsWith("/exam-preview/listening")) {
    return <ExamWorkspaceSkeleton kind="listening" />;
  }
  if (pathname.startsWith("/exam-preview/reading")) {
    return <ExamWorkspaceSkeleton kind="reading" />;
  }

  if (pathname.match(/^\/tests\/[^/]+\/start\/?$/)) {
    return <TestStartSkeleton />;
  }
  if (pathname.match(/^\/tests\/[^/]+\/?$/)) {
    return <TestDetailSkeleton />;
  }
  if (pathname.startsWith("/tests")) {
    const requestedType = searchParams?.get("type");
    if (requestedType === "listening") {
      return <ListeningTestsSkeleton />;
    }
    const readingView = searchParams?.get("type") === "reading"
      || Boolean(searchParams?.get("source"))
      || Boolean(searchParams?.get("format"))
      || Boolean(searchParams?.get("access"))
      || Boolean(searchParams?.get("sort"));
    return readingView ? <ReadingTestsSkeleton /> : <TestsOverviewSkeleton />;
  }

  if (pathname.match(/^\/attempts\/[^/]+\/result\/?$/)) {
    return <AttemptResultSkeleton />;
  }
  if (pathname.match(/^\/attempts\/[^/]+\/review\/?$/)) {
    return <AttemptReviewSkeleton />;
  }
  if (pathname.match(/^\/attempts\/[^/]+\/reading\/?$/)) {
    return <ExamWorkspaceSkeleton kind="reading" />;
  }
  if (pathname.match(/^\/attempts\/[^/]+\/listening\/?$/)) {
    return <ExamWorkspaceSkeleton kind="listening" />;
  }
  if (pathname.startsWith("/attempts")) {
    return <RedirectSkeleton />;
  }

  if (pathname.startsWith("/dashboard")) {
    return <DashboardSkeleton />;
  }
  if (pathname.match(/^\/analytics\/(reading|listening|writing|speaking)\/?$/)) {
    return <AnalyticsSkeleton variant="skill" />;
  }
  if (pathname.startsWith("/analytics")) {
    return <AnalyticsSkeleton />;
  }
  if (pathname.startsWith("/history")) {
    return <HistorySkeleton />;
  }
  if (pathname.startsWith("/bookmarks")) {
    return <BookmarksSkeleton />;
  }
  if (pathname.startsWith("/leaderboard")) {
    return <LeaderboardSkeleton />;
  }
  if (pathname.startsWith("/achievements") || pathname.startsWith("/rewards")) {
    return <AchievementsSkeleton />;
  }
  if (pathname.startsWith("/subscription")) {
    return <SubscriptionSkeleton />;
  }
  if (pathname.startsWith("/writing/submissions")) {
    return <WritingResultSkeleton />;
  }
  if (pathname.startsWith("/writing/history")) {
    return <WritingHistorySkeleton />;
  }
  if (pathname.match(/^\/writing\/tasks\/[^/]+\/?$/)) {
    return <RedirectSkeleton />;
  }
  if (pathname.startsWith("/writing/tasks")) {
    return <WritingTasksSkeleton />;
  }
  if (pathname.startsWith("/writing")) {
    return <WritingSkeleton />;
  }
  if (pathname.startsWith("/speaking")) {
    return <ReservedSectionSkeleton variant="speaking" />;
  }
  if (pathname.startsWith("/articles")) {
    return <ReservedSectionSkeleton variant="articles" />;
  }
  if (pathname.startsWith("/settings")) {
    return <SettingsSkeleton />;
  }
  if (pathname.startsWith("/admin")) {
    return <AdminPanelSkeleton />;
  }
  if (pathname.startsWith("/login") || pathname.startsWith("/telegram")) {
    return <LoginOverlaySkeleton />;
  }
  if (pathname === "/") {
    return <MarketingSkeleton />;
  }
  return <GenericSkeleton isOverlay={false} />;
}
