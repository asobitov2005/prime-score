import { AdminAnalyticsPoint } from "./types-part-02";

export type AdminRole = "super_admin" | "admin";

export interface AdminIdentity {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
}

export type TestType = "reading" | "listening";

export type TestAccessType = "public" | "premium";

export type TestStatus = "draft" | "published" | "archived";

export type TestFormat = "full" | "passage_1" | "passage_2" | "passage_3" | "part_1" | "part_2" | "part_3" | "part_4";

export type SubscriptionStatus = "active" | "expired" | "paused";

export type PaymentStatus = "paused" | "pending" | "matched" | "completed" | "expired" | "canceled" | "review" | "failed" | "refunded";

export type PaymentMethod = "payme" | "click" | "uzum" | "manual" | "card_transfer";

export type WizardStepId = "metadata" | "content" | "questions" | "review";

export type PreviewMode = "desktop" | "tablet" | "mobile";

export type AdminQuestionBankPolicy = "not_supported";

export type AdminPaymentWorkflowState = "paused";

export type AdminListeningTimerPolicy = "audio_duration_plus_2_minutes";

export type AdminDraftChecklistStatus = "ready" | "draft" | "blocked";

export interface AdminUserSessionSummary {
  id: string;
  userId: string;
  deviceLabel: string;
  ipAddress: string;
  lastUsedAt: string;
  isActive: boolean;
}

export interface AdminDashboardKpi {
  label: string;
  value: string;
  delta: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface AdminQuickStats {
  fastestCompletionMin: number | null;
  averageAccuracy: number;
  highestBandAchieved: number | null;
}

export interface AdminDashboardOverview {
  usersTotal: number;
  usersNewToday: number;
  activeUsers7d: number;
  premiumUsers: number;
  testsTotal: number;
  testsPublished: number;
  testsDraft: number;
  testsArchived: number;
  attemptsTotal: number;
  attemptsCompleted: number;
  attemptsToday: number;
  paymentsPending: number;
  paymentsCompleted: number;
  revenueTotal: number;
  averageBand: number | null;
  completionRate: number;
  premiumRate: number;
  recentActivity: string[];
  revenueTrend: { date: string; value: number }[];
  registrationTrend: { date: string; value: number }[];
  attemptsByDay: { date: string; value: number }[];
  typeSplit: { reading: number; listening: number } | null;
  bandDistribution: { band: string; count: number }[];
  topActiveUsers: { name: string; attemptCount: number; lastActive: string | null }[];
  avgTimePerTest: { readingAvgMin: number | null; listeningAvgMin: number | null } | null;
  paymentMethodSplit: AdminAnalyticsPoint[];
  attemptStatusSplit: AdminAnalyticsPoint[];
  quickStats: AdminQuickStats | null;
}

export interface AdminTestSummary {
  id: string;
  title: string;
  type: TestType;
  format: TestFormat;
  source: "cambridge" | "real_exam" | "custom";
  sourceDetail: string;
  accessType: TestAccessType;
  status: TestStatus;
  reviewStatus: "needs_review" | "approved" | "rejected";
  updatedAt: string;
  questions: number;
  version: number;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  premiumState: "active" | "expired" | "free";
  attempts: number;
  band: string;
  lastActiveAt: string;
  leaderboardVisible: boolean;
}

export interface AdminPlanSummary {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  badgeLabel: string;
  perks: string[];
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
}

export interface AdminPromoCodeSummary {
  id: string;
  code: string;
  discount: string;
  uses: string;
  validUntil: string;
  status: "active" | "expired" | "paused";
}

export interface AdminPaymentSummary {
  id: string;
  invoiceCode: string;
  user: string;
  plan: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  card: string;
  expiresAt: string | null;
  statusReason: string | null;
  updatedAt: string;
}
