const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("dashboard metric values avoid extra-bold number styling", () => {
  const dashboardPage = fs.readFileSync(path.join(__dirname, "../app/(app)/dashboard/page.tsx"), "utf8");
  const averages = fs.readFileSync(path.join(__dirname, "../app/(app)/dashboard/dashboard-average-cards.tsx"), "utf8");
  const xpCard = fs.readFileSync(path.join(__dirname, "../app/(app)/dashboard/xp-summary-card.tsx"), "utf8");
  const skills = fs.readFileSync(path.join(__dirname, "../app/(app)/dashboard/skill-performance.tsx"), "utf8");

  assert.match(dashboardPage, /text-2xl font-semibold tracking-tight text-foreground/);
  assert.doesNotMatch(dashboardPage, /text-2xl font-black tracking-tight text-foreground/);
  assert.match(averages, /AVERAGE BAND/);
  assert.match(averages, /getAverageBand\(analytics, "speaking"\)/);
  assert.doesNotMatch(skills, /\+\$\{\w+ThisWeekCount \*/);
  assert.doesNotMatch(xpCard, /Next reward|Consistent Learner|badges\/streak/);
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
