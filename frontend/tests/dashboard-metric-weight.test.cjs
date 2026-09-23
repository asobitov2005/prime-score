const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("dashboard stays compact and no longer fetches removed XP metrics", () => {
  const dashboardPage = fs.readFileSync(path.join(__dirname, "../app/(app)/dashboard/page.tsx"), "utf8");
  const appShell = fs.readFileSync(path.join(__dirname, "../components/layout/app-shell.tsx"), "utf8");

  assert.match(dashboardPage, /DashboardGreeting/);
  assert.match(dashboardPage, /MockSessions/);
  assert.match(dashboardPage, /getRecentActivity/);
  assert.doesNotMatch(dashboardPage, /getDashboardAnalytics|getWeeklyLeaderboardPreview|getXpSummary|buildWeaknessDiagnosis|pickQuickTests|OverallBandKpiCard|SkillPerformance|StreakHeatmap|XpSummaryCard/);
  assert.doesNotMatch(appShell, /SidebarXpCard|getXpSummary|setXpSummary/);
});

test("achievement badges are removed from the app navigation and leaderboard", () => {
  const appShell = fs.readFileSync(path.join(__dirname, "../components/layout/app-shell.tsx"), "utf8");
  const leaderboard = fs.readFileSync(path.join(__dirname, "../app/(app)/leaderboard/page.tsx"), "utf8");
  const profileModal = fs.readFileSync(path.join(__dirname, "../components/leaderboard/user-profile-modal.tsx"), "utf8");

  assert.doesNotMatch(appShell, /label: "Achievements"/);
  assert.doesNotMatch(leaderboard, /entry\.badge|badgeImage|achievement/i);
  assert.doesNotMatch(profileModal, /badge|achievement/i);
  assert.doesNotMatch(leaderboard, /getLeaderboardUserProfile/);
});

test("server-rendered dashboard metrics do not import the client analytics hook", () => {
  const files = [
    "../app/(app)/dashboard/dashboard-average-cards.tsx",
    "../app/(app)/dashboard/skill-performance.tsx",
    "../lib/dashboard-trend.ts",
  ];

  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(__dirname, relativePath), "utf8");
    assert.doesNotMatch(source, /@\/components\/charts\/use-dashboard-analytics/);
  }
});

test("dashboard trend date grouping uses the app timezone", () => {
  const trend = fs.readFileSync(path.join(__dirname, "../lib/dashboard-trend.ts"), "utf8");
  assert.match(trend, /getDateKeyInTimeZone\(date, APP_TIME_ZONE\)/);
  assert.match(trend, /trendByDay\.set\(toAppDayKey\(occurredAt\), value\)/);
  assert.doesNotMatch(trend, /getFullYear\(\)|getMonth\(\)|getDate\(\)/);
});

test("leaderboard profile labels XP with the selected period", () => {
  const profile = fs.readFileSync(path.join(__dirname, "../components/leaderboard/user-profile-modal.tsx"), "utf8");
  const leaderboard = fs.readFileSync(path.join(__dirname, "../app/(app)/leaderboard/page.tsx"), "utf8");
  assert.match(profile, /periodXp/);
  assert.match(profile, /user\.periodLabel\} XP/);
  assert.doesNotMatch(profile, /totalXp/);
  assert.match(leaderboard, /periodXp: entry\.xp/);
});
