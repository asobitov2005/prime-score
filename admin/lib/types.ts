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
  | "audio_transcription";

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

export interface AdminAiProviderModel {
  id: string;
  modelId: string;
  displayName: string;
  family: string | null;
  capabilities: Record<string, unknown>;
  contextWindow: number | null;
  isAccessible: boolean;
  isSelectable: boolean;
  sortOrder: number;
}

export interface AdminAiUseCaseBinding {
  id: string | null;
  useCase: AiUseCase;
  providerConfigId: string | null;
  provider: AiProvider | null;
  providerLabel: string | null;
  providerModelId: string | null;
  modelId: string | null;
  modelDisplayName: string | null;
  settingsJson: Record<string, unknown>;
  resolvedSource: string;
}

export interface AdminWritingPromptEntry {
  id?: string;
  key: WritingPromptKey;
  body: string;
  format: "text" | "json";
}

export interface AdminWritingPromptProfile {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  taskTypeScope: WritingTaskTypeScope;
  status: WritingConfigStatus;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  entries: AdminWritingPromptEntry[];
}

export interface AdminWritingRubric {
  id: string;
  taskTypeScope: WritingTaskTypeScope;
  version: number;
  body: string;
  status: WritingConfigStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWritingAnchorItem {
  id?: string;
  band: number;
  essay: string;
  criteria: Record<string, unknown>;
  rationale: string;
  sortOrder?: number;
}

export interface AdminWritingAnchorSet {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  taskTypeScope: WritingTaskTypeScope;
  version: number;
  status: WritingConfigStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: AdminWritingAnchorItem[];
}

export interface AdminWritingPromptPreview {
  graderSystem: string;
  graderUser: string;
  improvedVersion: string;
  roastSystem: string;
  roastUser: string;
}

export interface AdminWritingConfigAuditEntry {
  id: string;
  actorAdminId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  previousVersion: number | null;
  newVersion: number | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
}

export interface AdminTranscriptQuestionLocation {
  questionId?: string;
  questionLabel: string;
  questionPrompt: string;
  startSec: number;
  endSec: number;
  answerText: string;
  correctAnswer: string;
}

export interface AdminTestDraftQuestion {
  id: string;
  label: string;
  prompt: string;
  acceptedAnswers: string[];
  explanation: string;
  variants: string[]; // Added for MCQ options per question
}

export interface AdminTestDraftQuestionGroup {
  id: string;
  sectionId: string;
  title: string;
  instructions: string;
  optionsTitle?: string;
  typeId: string;
  questionStart: number;
  questionEnd: number;
  sharedOptions: string[];
  rawContent?: string;
  // Block-based input fields
  questionBlock?: string;
  answerBlock?: string;
  secondaryBlock?: string; // Used for Headings, Features, etc.
  diagramTitle?: string;
  diagramImageUrl?: string;
  questions: AdminTestDraftQuestion[];
}

export interface AdminTestDraftChecklistItem {
  id: string;
  label: string;
  status: AdminDraftChecklistStatus;
  detail: string;
}

export interface AdminTestDraftReview {
  checklist: AdminTestDraftChecklistItem[];
  notes: string[];
}

export interface AdminTestDraftState {
  metadata: AdminTestDraftMetadata;
  content: {
    sections: AdminTestDraftContentSection[];
  };
  questionGroups: AdminTestDraftQuestionGroup[];
  questions: AdminTestDraftQuestion[]; // Keep for backward compatibility or direct access if needed, but we'll prefer questionGroups
  review: AdminTestDraftReview;
  decisions: AdminEditorDecisionFlags;
}
