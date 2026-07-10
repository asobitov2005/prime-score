import { DashboardSpeakingCriteria, DashboardWritingCriteria } from "./types-part-01";
import { DashboardSkillTimeAnalysis } from "./types-part-03";

export interface DashboardQuestionTypeAnalysisItem {
  label: string;
  workedCount: number;
  correctCount: number;
  accuracy: number;
  errorCount: number;
}

export interface DashboardQuestionTypeComparisonItem {
  label: string;
  previousAccuracy: number | null;
  currentAccuracy: number | null;
  delta: number | null;
  accuracies: Array<number | null>;
  currentWorkedCount: number;
  currentErrorCount: number;
}

export interface DashboardQuestionTypeComparisonTest {
  testTitle: string;
  testDate: string;
}

export interface DashboardQuestionTypeComparison {
  previousTestTitle: string | null;
  previousTestDate: string | null;
  currentTestTitle: string | null;
  currentTestDate: string | null;
  tests: DashboardQuestionTypeComparisonTest[];
  items: DashboardQuestionTypeComparisonItem[];
}

export interface DashboardErrorDistributionItem {
  label: string;
  errorCount: number;
  share: number;
}

export interface DashboardBandProgressPoint {
  label: string;
  occurredAt: string;
  reading: number | null;
  listening: number | null;
  writing?: number | null;
  speaking?: number | null;
}

export interface DashboardPerformanceStudyTime {
  totalTimeSec: number;
  readingTimeSec: number;
  listeningTimeSec: number;
  writingTimeSec?: number;
  speakingTimeSec?: number;
  thisWeekMinutes?: number;
  dailyGoalMinutes?: number;
}

export interface DashboardPerformanceTestCountBucket {
  fullCount: number;
  section1Count: number;
  section2Count: number;
  section3Count: number;
  section4Count: number;
}

export interface DashboardPerformanceSummary {
  studyTime: DashboardPerformanceStudyTime;
  reading: DashboardPerformanceTestCountBucket;
  listening: DashboardPerformanceTestCountBucket;
  writing?: DashboardPerformanceTestCountBucket;
  speaking?: DashboardPerformanceTestCountBucket;
}

export interface DashboardAnalytics {
  performanceSummary: DashboardPerformanceSummary;
  writingCriteria?: DashboardWritingCriteria | null;
  speakingCriteria?: DashboardSpeakingCriteria | null;
  questionTypeAnalysis: DashboardQuestionTypeAnalysisItem[];
  comparison: DashboardQuestionTypeComparison;
  errorDistribution: DashboardErrorDistributionItem[];
  progressSeries: DashboardBandProgressPoint[];
  accuracyTrend: DashboardAccuracyTrendPoint[];
  weeklyActivity: DashboardWeeklyActivityPoint[];
  scoreDistribution: DashboardScoreDistribution;
  personalBests: DashboardPersonalBests;
  speedMetrics: DashboardSpeedMetrics;
  improvementRate: DashboardImprovementRate;
  sectionAnalysis: DashboardSectionAnalysisItem[];
  skillFocus: DashboardSkillFocusItem[];
  timeAnalysis: DashboardSkillTimeAnalysis;
}

export interface DashboardAccuracyTrendPoint {
  date: string;
  accuracy: number;
  band: number | null;
  testType: string | null;
}

export interface DashboardWeeklyActivityPoint {
  weekLabel: string;
  attemptsCount: number;
  timeSpentMin: number;
}

export interface DashboardActivityPoint {
  activityDate: string;
  attemptsCount: number;
  timeSpentSec: number;
  readingTimeSec: number;
  listeningTimeSec: number;
  writingTimeSec: number;
  speakingTimeSec?: number;
}

export interface DashboardScoreDistribution {
  band1To3: number;
  band3_5To5: number;
  band5To6_5: number;
  band6_5To7_5: number;
  band7_5To9: number;
}

export interface DashboardPersonalBests {
  bestBand: number | null;
  bestAccuracy: number | null;
  longestStreak: number;
  currentStreak: number;
  fastestFullTestSec: number | null;
}

export interface DashboardSpeedMetrics {
  avgTimePerQuestionSec: number | null;
  readingAvgSecPerQuestion: number | null;
  listeningAvgSecPerQuestion: number | null;
}

export interface DashboardImprovementRate {
  last5AvgBand: number | null;
  prev5AvgBand: number | null;
  delta: number | null;
  percentChange: number | null;
}

export interface DashboardSectionAnalysisItem {
  sectionNumber: number;
  label: string;
  workedCount: number;
  correctCount: number;
  accuracy: number;
  attemptsCount: number;
  avgTimeSec: number | null;
}

export interface DashboardSkillFocusItem {
  key: string;
  label: string;
  value: number | null;
  valueLabel: string;
  subtext: string | null;
  status: string | null;
}
