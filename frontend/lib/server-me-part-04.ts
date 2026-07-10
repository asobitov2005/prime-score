import { DashboardAnalytics, TestType, XpSummary, roundIeltsBand } from "./server-me-dependencies";
import { BackendDashboardAnalytics, BackendXpSummary } from "./server-me-part-01";
import { BackendLeaderboardResponse, LeaderboardPreviewSummary, mapQuestionTypeAnalysis, requestBackend } from "./server-me-part-02";
import { mapComparison, mapErrorDistribution, mapPerformanceSummary, mapProgressSeries, mapSectionAnalysisItem, mapSkillFocusItem, mapSkillTimeAnalysis } from "./server-me-part-03";

export async function getXpSummary(): Promise<XpSummary> {
  try {
    const summary = await requestBackend<BackendXpSummary>("/me/xp-summary");
    return {
      totalXp: summary.total_xp,
      level: summary.level,
      currentStreak: summary.current_streak,
      bestStreak: summary.best_streak,
      weeklyXp: summary.weekly_xp,
      monthlyXp: summary.monthly_xp,
      latestXpGain: summary.latest_xp_gain ?? null,
      progress: {
        level: summary.progress.level,
        levelFloorXp: summary.progress.level_floor_xp,
        nextLevelXp: summary.progress.next_level_xp,
        xpIntoLevel: summary.progress.xp_into_level,
        xpNeededForNextLevel: summary.progress.xp_needed_for_next_level,
        progressPercent: summary.progress.progress_percent,
      },
    };
  } catch {
    return {
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      bestStreak: 0,
      weeklyXp: 0,
      monthlyXp: 0,
      latestXpGain: null,
      progress: {
        level: 1,
        levelFloorXp: 0,
        nextLevelXp: 100,
        xpIntoLevel: 0,
        xpNeededForNextLevel: 100,
        progressPercent: 0,
      },
    };
  }
}

export async function getLeaderboardRank(type: "combined" | TestType = "combined"): Promise<number | null> {
  try {
    const payload = await requestBackend<BackendLeaderboardResponse>(`/leaderboard?type=${encodeURIComponent(type)}&period=all_time`);
    return effectiveCurrentUserRank(payload);
  } catch {
    return null;
  }
}

export function effectiveCurrentUserRank(payload: BackendLeaderboardResponse): number | null {
  const rank = payload.current_user?.rank ?? null;
  if (typeof rank === "number" && rank > 0) {
    return rank;
  }
  if (payload.current_user) {
    return payload.items.length + 1;
  }
  return null;
}

export async function getWeeklyLeaderboardPreview(): Promise<LeaderboardPreviewSummary> {
  try {
    const payload = await requestBackend<BackendLeaderboardResponse>("/leaderboard?period=week");
    const rank = effectiveCurrentUserRank(payload);
    if (rank === null) {
      return { rank: null, topPercent: null };
    }

    const leaderboardSize = Math.max(payload.items.length, rank);
    const topPercent = leaderboardSize > 0
      ? Math.max(1, Math.min(100, Math.ceil((rank / leaderboardSize) * 100)))
      : null;

    return { rank, topPercent };
  } catch {
    return { rank: null, topPercent: null };
  }
}

export async function getDashboardAnalytics(testType?: TestType): Promise<DashboardAnalytics> {
  try {
    const suffix = testType ? `?test_type=${encodeURIComponent(testType)}` : "";
    const analytics = await requestBackend<BackendDashboardAnalytics>(`/me/analytics${suffix}`);
    const sd = analytics.score_distribution;
    const pb = analytics.personal_bests;
    const sm = analytics.speed_metrics;
    const ir = analytics.improvement_rate;
    return {
      performanceSummary: mapPerformanceSummary(analytics.performance_summary),
      writingCriteria: analytics.writing_criteria ? {
        taskAchievement: roundIeltsBand(analytics.writing_criteria.task_achievement),
        coherenceCohesion: roundIeltsBand(analytics.writing_criteria.coherence_cohesion),
        lexicalResource: roundIeltsBand(analytics.writing_criteria.lexical_resource),
        grammaticalRangeAccuracy: roundIeltsBand(analytics.writing_criteria.grammatical_range_accuracy),
      } : null,
      speakingCriteria: analytics.speaking_criteria ? {
        fluency: roundIeltsBand(analytics.speaking_criteria.fluency),
        lexicalResource: roundIeltsBand(analytics.speaking_criteria.lexical_resource),
        grammar: roundIeltsBand(analytics.speaking_criteria.grammar),
        pronunciation: roundIeltsBand(analytics.speaking_criteria.pronunciation),
      } : null,
      questionTypeAnalysis: mapQuestionTypeAnalysis(analytics.question_type_analysis),
      comparison: mapComparison(analytics.comparison),
      errorDistribution: mapErrorDistribution(analytics.error_distribution),
      progressSeries: mapProgressSeries(analytics.progress_series),
      accuracyTrend: (analytics.accuracy_trend ?? []).map((p) => ({
        date: p.date,
        accuracy: p.accuracy,
        band: roundIeltsBand(p.band),
        testType: p.test_type ?? null,
      })),
      weeklyActivity: (analytics.weekly_activity ?? []).map((p) => ({
        weekLabel: p.week_label,
        attemptsCount: p.attempts_count,
        timeSpentMin: p.time_spent_min,
      })),
      scoreDistribution: {
        band1To3: sd?.band_1_to_3 ?? 0,
        band3_5To5: sd?.band_3_5_to_5 ?? 0,
        band5To6_5: sd?.band_5_to_6_5 ?? 0,
        band6_5To7_5: sd?.band_6_5_to_7_5 ?? 0,
        band7_5To9: sd?.band_7_5_to_9 ?? 0,
      },
      personalBests: {
        bestBand: roundIeltsBand(pb?.best_band),
        bestAccuracy: pb?.best_accuracy ?? null,
        longestStreak: pb?.longest_streak ?? 0,
        currentStreak: pb?.current_streak ?? 0,
        fastestFullTestSec: pb?.fastest_full_test_sec ?? null,
      },
      speedMetrics: {
        avgTimePerQuestionSec: sm?.avg_time_per_question_sec ?? null,
        readingAvgSecPerQuestion: sm?.reading_avg_sec_per_question ?? null,
        listeningAvgSecPerQuestion: sm?.listening_avg_sec_per_question ?? null,
      },
      improvementRate: {
        last5AvgBand: ir?.last_5_avg_band ?? null,
        prev5AvgBand: ir?.prev_5_avg_band ?? null,
        delta: ir?.delta ?? null,
        percentChange: ir?.percent_change ?? null,
      },
      sectionAnalysis: (analytics.section_analysis ?? []).map(mapSectionAnalysisItem),
      skillFocus: (analytics.skill_focus ?? []).map(mapSkillFocusItem),
      timeAnalysis: mapSkillTimeAnalysis(analytics.time_analysis),
    };
  } catch {
    return {
      performanceSummary: {
        studyTime: { totalTimeSec: 0, readingTimeSec: 0, listeningTimeSec: 0, writingTimeSec: 0, speakingTimeSec: 0 },
        reading: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
        listening: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
        writing: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
        speaking: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 }
      },
      writingCriteria: null,
      speakingCriteria: null,
      questionTypeAnalysis: [],
      comparison: {
        previousTestTitle: null,
        previousTestDate: null,
        currentTestTitle: null,
        currentTestDate: null,
        tests: [],
        items: []
      },
      errorDistribution: [],
      progressSeries: [],
      accuracyTrend: [],
      weeklyActivity: [],
      scoreDistribution: { band1To3: 0, band3_5To5: 0, band5To6_5: 0, band6_5To7_5: 0, band7_5To9: 0 },
      personalBests: { bestBand: null, bestAccuracy: null, longestStreak: 0, currentStreak: 0, fastestFullTestSec: null },
      speedMetrics: { avgTimePerQuestionSec: null, readingAvgSecPerQuestion: null, listeningAvgSecPerQuestion: null },
      improvementRate: { last5AvgBand: null, prev5AvgBand: null, delta: null, percentChange: null },
      sectionAnalysis: [],
      skillFocus: [],
      timeAnalysis: {
        avgTimePerTestSec: null,
        recommendedTimeSec: null,
        timeManagementStatus: "No timing data",
        slowestSection: null,
        fastestSection: null,
        unansweredAvgPercent: null,
      },
    };
  }
}
