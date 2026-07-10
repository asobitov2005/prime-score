import { buildWeaknessDiagnosis, getCatalogTests, getDashboardActivity, getDashboardAnalytics, getUserAttempts, getWeeklyLeaderboardPreview, getWritingHistory, getXpSummary, pickQuickTests } from "./dependencies";
import { RecentActivityItem, getInProgressTest } from "./shared";

export async function loadDashboardPageData() {
  const [attempts, analytics, writingHistory, catalogTests, activity, xpSummary, leaderboardPreview] = await Promise.all([
      getUserAttempts(),
      getDashboardAnalytics(),
      getWritingHistory().catch(() => ({ items: [], total: 0 })),
      getCatalogTests().catch(() => []),
      getDashboardActivity(),
      getXpSummary(),
      getWeeklyLeaderboardPreview(),
    ]);
  const recentAttempts = attempts.filter((attempt) => attempt.status === "completed" || attempt.status === "submitted");
  const recentActivity: RecentActivityItem[] = [
      ...recentAttempts.map((attempt) => ({
        kind: "attempt" as const,
        key: attempt.id,
        sortAt: attempt.lastSavedAt,
        attempt,
      })),
      ...writingHistory.items.map((submission) => ({
        kind: "writing" as const,
        key: submission.submission_id,
        sortAt: submission.submitted_at ?? submission.graded_at ?? "",
        submission,
      })),
    ]
      .sort((left, right) => new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime())
      .slice(0, 3);
  const attemptedTestIds = new Set(attempts.map((attempt) => attempt.testId));
  const featuredTests = pickQuickTests(
      catalogTests.filter((test) => test.type === "reading" || test.type === "listening"),
      attemptedTestIds,
      3,
    );
  const inProgressTest = getInProgressTest(attempts);
  const completedAttempts = attempts.filter(
      (attempt) => attempt.status === "completed" || attempt.status === "submitted",
    );
  const now = new Date();
  const hasTests = completedAttempts.length > 0;
  const lastAttempt = hasTests ? completedAttempts[0] : null;
  let daysSinceLast = 0;
  if (lastAttempt?.lastSavedAt) {
      const lastDate = new Date(lastAttempt.lastSavedAt);
      if (!Number.isNaN(lastDate.getTime())) {
        daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      }
    }
  const lastBand = lastAttempt && lastAttempt.band ? parseFloat(lastAttempt.band) : 0;
  // Mock weak type logic
    const weakType = analytics.errorDistribution[0]?.label ?? (lastAttempt?.type === "reading" ? "True / False / Not Given" : "Map / Diagram");
  const hasWeakType = analytics.errorDistribution.length > 0;
  let recTitle = "";
  let recDesc = "";
  let recBtnText = "";
  let recHref = "/tests";
  if (!hasTests) {
      recTitle = "Start your first test";
      recDesc = "Take your first IELTS mock test to establish your baseline score and identify your weak areas.";
      recBtnText = "Explore Tests";
    } else if (daysSinceLast > 3) {
      recTitle = "Get back on track";
      recDesc = `You haven't practiced in ${daysSinceLast} days. Consistency is key to improving your score.`;
      recBtnText = "Take a quick test";
    } else if (lastBand > 0 && lastBand < 6.0) {
      recTitle = `Practice more ${lastAttempt?.type} section`;
      recDesc = `Your last ${lastAttempt?.type} score was ${lastBand}. Try another test specifically for this section to improve.`;
      recBtnText = `Practice ${lastAttempt?.type}`;
      recHref = `/tests?type=${lastAttempt?.type}`;
    } else if (hasWeakType && lastBand >= 6.0 && lastBand < 7.5) {
      recTitle = `Improve ${weakType} questions`;
      recDesc = `Analytics show you lose points on ${weakType}. Focus your next practice on passage structure and techniques for this type.`;
      recBtnText = "Practice targeted skills";
      recHref = `/tests?type=${lastAttempt?.type}`;
    } else {
      recTitle = "Try a full mock test";
      recDesc = "You are scoring consistently well! Challenge yourself with a full mock test under strict exam conditions.";
      recBtnText = "Start Full Mock";
    }
  const weaknessDiagnosis = buildWeaknessDiagnosis(analytics, attempts, daysSinceLast);
  const diagnosisAccent = {
      critical: {
        ring: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
        dot: "bg-red-500",
        wash: "from-red-500/12 via-orange-500/8 to-transparent",
      },
      attention: {
        ring: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
        wash: "from-amber-500/12 via-blue-500/8 to-transparent",
      },
      steady: {
        ring: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
        wash: "from-emerald-500/12 via-blue-500/8 to-transparent",
      },
    }[weaknessDiagnosis.severity];
  return { attempts, analytics, writingHistory, catalogTests, activity, xpSummary, leaderboardPreview, recentAttempts, recentActivity, attemptedTestIds, featuredTests, inProgressTest, completedAttempts, now, hasTests, lastAttempt, daysSinceLast, lastBand, weakType, hasWeakType, recTitle, recDesc, recBtnText, recHref, weaknessDiagnosis, diagnosisAccent };
}

export type DashboardPageData = Awaited<ReturnType<typeof loadDashboardPageData>>;
