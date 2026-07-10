import { AttemptMode, LeaderboardPeriod, TestCatalogItem, TestType } from "./types-part-01";
import { DashboardSectionAnalysisItem } from "./types-part-02";

export interface DashboardSkillTimeAnalysis {
  avgTimePerTestSec: number | null;
  recommendedTimeSec: number | null;
  timeManagementStatus: string;
  slowestSection: DashboardSectionAnalysisItem | null;
  fastestSection: DashboardSectionAnalysisItem | null;
  unansweredAvgPercent: number | null;
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
  avatarUrl: string | null;
  name: string;
  level: number;
  xp: number;
  currentStreak: number;
  badge: string | null;
  averageScore: number | null;
  fullMockCompletions: number;
  achievedAt: string | null;
  qualified: boolean;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponseData {
  period: LeaderboardPeriod;
  items: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}

export interface XpLevelProgress {
  level: number;
  levelFloorXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
}

export interface XpSummary {
  totalXp: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  weeklyXp: number;
  monthlyXp: number;
  latestXpGain: number | null;
  progress: XpLevelProgress;
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
  supportContact: string;
  paymentInstructions: string;
  expiresAt: string | null;
  matchedAt: string | null;
  paidAt: string | null;
  archivedAt: string | null;
  grantedUntil: string | null;
  statusReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type UserGiftCodeStatus = "available" | "paused" | "redeemed" | "revoked" | "expired";

export interface UserGiftCodeSummaryItem {
  giftDays: number;
  totalCount: number;
  generatedCount: number;
  availableCount: number;
}

export interface UserGiftCodeRecord {
  id: string;
  code: string;
  durationDays: number;
  status: UserGiftCodeStatus;
  expiresAt: string | null;
  redeemedAt: string | null;
  createdAt: string | null;
}

export interface UserGiftCodeSummary {
  items: UserGiftCodeSummaryItem[];
  recentCodes: UserGiftCodeRecord[];
  totalAvailableCount: number;
  canGenerate: boolean;
}

export interface AttemptWorkspaceMeta {
  timeLimitSeconds: number;
  currentSectionId: string;
  currentSectionTitle: string;
  currentSectionQuestionCount: number;
}
