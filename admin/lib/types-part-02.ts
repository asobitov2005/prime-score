import { AdminListeningTimerPolicy, AdminPaymentWorkflowState, AdminQuestionBankPolicy, TestAccessType, TestFormat, TestStatus, TestType } from "./types-part-01";
import { AdminTranscriptQuestionLocation } from "./types-part-03";

export interface AdminPaymentCardSummary {
  id: string;
  label: string;
  cardNumber: string;
  cardType: string;
  holderName: string | null;
  isActive: boolean;
  priority: number;
}

export interface AdminPaymentSettingsSummary {
  id: string;
  supportContact: string | null;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  createdAt: string;
  meta: string;
}

export interface QuestionTypeOption {
  id: string;
  label: string;
  family: "selection" | "matching" | "completion" | "labeling" | "short-answer";
  description: string;
}

export interface AdminAnalyticsPoint {
  label: string;
  value: number;
}

export interface AdminAnalyticsReport {
  dau: number;
  wau: number;
  mau: number;
  conversionRate: string;
  churnRate: string;
  activityPoints: AdminAnalyticsPoint[];
  topTests: { title: string; count: number }[];
  hardestTypes: { type: string; errorRate: string }[];
  dauTrend: { date: string; value: number }[];
  completionFunnel: { started: number; completed: number; rate: number } | null;
  avgScoreByTest: { testTitle: string; avgBand: number | null; attemptCount: number }[];
  hourlyDistribution: { label: string; value: number }[];
  userSegmentation: { free: { count: number; avgAttempts: number }; premium: { count: number; avgAttempts: number } } | null;
  weekdayActivity: AdminAnalyticsPoint[];
}

export interface AdminPreviewSection {
  id: string;
  title: string;
  subtitle: string;
  content: string;
}

export interface AdminEditorDecisionFlags {
  questionBank: {
    label: string;
    state: AdminQuestionBankPolicy;
    detail: string;
  };
  payment: {
    label: string;
    state: AdminPaymentWorkflowState;
    detail: string;
  };
  listeningTimer: {
    label: string;
    state: AdminListeningTimerPolicy;
    detail: string;
  };
}

export interface AdminTestDraftMetadata {
  title: string;
  type: TestType;
  format: TestFormat;
  source: "cambridge" | "real_exam" | "custom";
  sourceDetail: string;
  accessType: TestAccessType;
  status: TestStatus;
  version: number;
  timeLimitLabel: string;
}

export interface AdminTestDraftContentSection {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  content: string; // Used for raw text input
  paragraphs?: { id: string; label: string; text: string }[];
  showLabels?: boolean; // Toggle for A, B, C labels
  mediaKind: "text" | "audio";
  audioUrl?: string;
  audioDurationSeconds?: number | null;
  transcript?: string;
  transcriptSegments?: AdminTranscriptSegment[];
  transcriptQuestionLocations?: AdminTranscriptQuestionLocation[];
  markerCount: number;
}

export interface AdminTranscriptSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  confidence?: number;
  driftStartSec?: number;
  driftEndSec?: number;
  needsReview?: boolean;
}

export type AiProvider = "google" | "cerebras" | "groq";

export type AiUseCase =
  | "admin_chat"
  | "writing_grader"
  | "writing_improver"
  | "writing_roast"
  | "writing_image_summary"
  | "audio_transcription"
  | "speaking_examiner"
  | "speaking_grader";

export type WritingTaskTypeScope = "all" | "task_1" | "task_2";

export type WritingConfigStatus = "draft" | "published" | "archived";

export type WritingPromptKey =
  | "grader_system"
  | "grader_user_template"
  | "criterion_task_achievement"
  | "criterion_coherence_cohesion"
  | "criterion_lexical_resource"
  | "criterion_grammar_accuracy"
  | "annotation_prompt"
  | "annotation_repair_prompt"
  | "json_repair_prompt"
  | "improved_version_prompt"
  | "roast_system"
  | "roast_user_template"
  | "vocabulary_upgrade_policy";

export interface AdminAiProviderConfig {
  id: string;
  provider: AiProvider;
  label: string;
  apiKeyMasked: string | null;
  hasApiKey: boolean;
  baseUrl: string | null;
  isEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}
