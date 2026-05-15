export type TestType = "reading" | "listening" | "writing";
export type TestScope = "full" | "section";
export type AttemptMode = "practice" | "exam";
export type AccessType = "public" | "premium";
export type TestStatus = "draft" | "published" | "archived";
export type PlanDuration = number;
export type LeaderboardPeriod = "week" | "month" | "all_time";

export type ReadingQuestionType =
  | "reading_mc_single"
  | "reading_mc_multiple"
  | "reading_true_false_not_given"
  | "reading_yes_no_not_given"
  | "reading_matching_information"
  | "reading_matching_headings"
  | "reading_matching_features"
  | "reading_matching_sentence_endings"
  | "reading_sentence_completion"
  | "reading_summary_completion_wordbank"
  | "reading_summary_completion_freetext"
  | "reading_note_completion"
  | "reading_table_completion"
  | "reading_flowchart_completion"
  | "reading_diagram_labeling"
  | "reading_short_answer";

export type ListeningQuestionType =
  | "listening_mc_single"
  | "listening_mc_multiple"
  | "listening_matching"
  | "listening_plan_map_labeling"
  | "listening_plan_map_diagram_labeling"
  | "listening_form_completion"
  | "listening_note_completion"
  | "listening_table_completion"
  | "listening_flowchart_completion"
  | "listening_summary_completion"
  | "listening_sentence_completion"
  | "listening_short_answer";

export type QuestionType = ReadingQuestionType | ListeningQuestionType;

export interface TestSectionSummary {
  id: string;
  number: number;
  title: string;
  questionCount: number;
  teaser: string;
}

export interface TestCatalogItem {
  id: string;
  slug: string;
  title: string;
  sectionTitle?: string;
  type: TestType;
  format: "full" | "passage_1" | "passage_2" | "passage_3" | "part_1" | "part_2" | "part_3" | "part_4";
  accessType: AccessType;
  status: TestStatus;
  source: string;
  sourceDetail: string;
  questionCount: number;
  estimatedMinutes: number;
  isPremiumLocked: boolean;
  description: string;
  tags: string[];
  sections: TestSectionSummary[];
}

export type CatalogTest = TestCatalogItem;

export interface TestQuestionOption {
  id: string;
  label: string;
}

export interface TestQuestion {
  id: string;
  number: number;
  label?: string;
  type: QuestionType;
  prompt: string;
  instructions?: string;
  options?: TestQuestionOption[];
  wordBank?: string[];
  answerSlots?: number;
  selectionLimit?: number;
  sectionId?: string;
  sectionTitle?: string;
  groupId?: string;
  groupTitle?: string;
  explanation?: string;
}

export interface TestQuestionGroup {
  id: string;
  title: string;
  type: QuestionType;
  questionStart: number;
  questionEnd: number;
  diagramTitle?: string;
  diagramImageUrl?: string;
  questions: TestQuestion[];
}

export interface ReadingPassage {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  paragraphs: string[];
  questions: TestQuestion[];
  questionGroups: TestQuestionGroup[];
  images?: Array<{ alt: string; caption: string }>;
}

export interface ListeningSegment {
  id: string;
  label: string;
  startSecond: number;
  endSecond: number;
}

export interface ListeningPart {
  id: string;
  title: string;
  subtitle: string;
  transcriptSummary: string;
  segments: ListeningSegment[];
  questions: TestQuestion[];
  questionGroups: TestQuestionGroup[];
  audioDurationSeconds: number;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
}

export interface DashboardWritingCriteria {
  taskAchievement: number | null;
  coherenceCohesion: number | null;
  lexicalResource: number | null;
  grammaticalRangeAccuracy: number | null;
}

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
}

export interface DashboardPerformanceStudyTime {
  totalTimeSec: number;
  readingTimeSec: number;
  listeningTimeSec: number;
  writingTimeSec?: number;
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
}

export interface DashboardAnalytics {
  performanceSummary: DashboardPerformanceSummary;
  writingCriteria?: DashboardWritingCriteria | null;
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

export interface AttemptRow {
  id: string;
  testId: string;
  testTitle: string;
  type: TestType;
  testFormat: TestCatalogItem["format"];
  source: string;
  mode: AttemptMode;
  date: string;
  lastSavedAt: string;
  score: string;
  band: string | null;
  totalQuestions: number | null;
  timeSpent: string;
  timeSpentSec?: number | null;
  answeredCount?: number;
  progressPercent?: number;
  timeLimitSeconds?: number;
  lastAnsweredQuestionNumber?: number | null;
  status: "completed" | "in_progress" | "submitted";
  violationCount?: number;
}

export interface TestCardAttemptSummary {
  id: string;
  mode: AttemptMode;
  status: AttemptRow["status"];
  score: string;
  band: string | null;
  totalQuestions: number | null;
  lastSavedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  type: TestType | "combined";
  percentile: number;
  estimatedBand: string | null;
  readingScore: string | null;
  listeningScore: string | null;
  attempts: number;
  totalTime: string;
  avgAccuracy: number | null;
  lastActiveAt: string | null;
  qualified: boolean;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponseData {
  type: TestType | "combined";
  period: LeaderboardPeriod;
  items: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}

export interface SubscriptionPlan {
  id: string;
  durationDays: number;
  title: string;
  price: string;
  discountLabel: string;
  perks: string[];
}

export type UserPaymentStatus =
  | "pending"
  | "matched"
  | "completed"
  | "expired"
  | "canceled"
  | "review"
  | "failed";

export interface UserPaymentRecord {
  id: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  durationDays: number | null;
  method: "card_transfer" | "manual" | "payme" | "click" | "uzum";
  status: UserPaymentStatus;
  baseAmount: string;
  compareAtAmount: string;
  amount: string;
  discountAmount: string;
  currency: string;
  cardLabel: string | null;
  cardNumber: string | null;
  wheelOptions: string[];
  expiresAt: string | null;
  matchedAt: string | null;
  paidAt: string | null;
  archivedAt: string | null;
  grantedUntil: string | null;
  statusReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AttemptWorkspaceMeta {
  timeLimitSeconds: number;
  currentSectionId: string;
  currentSectionTitle: string;
  currentSectionQuestionCount: number;
}
