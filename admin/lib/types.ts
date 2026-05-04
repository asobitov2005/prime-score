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
  botSource: string;
}

export interface AdminPaymentSettingsSummary {
  id: string;
  telegramApiId: string | null;
  telegramApiHash: string | null;
  phoneNumber: string | null;
  activeBot: string;
  supportContact: string | null;
  isEnabled: boolean;
  pollFallbackEnabled: boolean;
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

export type AdminAiThreadStatus = "idle" | "queued" | "running" | "completed" | "failed" | "archived";
export type AdminAiJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AdminAiMessageRole = "system" | "user" | "assistant" | "tool";
export type AdminAiMessageStatus = "pending" | "streaming" | "completed" | "failed";
export type AdminAiTraceStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type AdminAiWorkspaceScopeType = "test" | "plan" | "user" | "analytics" | "general";

export interface AdminAiWorkspaceScope {
  type: AdminAiWorkspaceScopeType;
  id?: string;
  label: string;
  description?: string;
}

export interface AdminAiThreadSummary {
  id: string;
  title: string;
  summary: string;
  status: AdminAiThreadStatus;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
  lastMessagePreview: string;
  activeJobId?: string | null;
  scope: AdminAiWorkspaceScope;
}

export interface AdminAiMessage {
  id: string;
  role: AdminAiMessageRole;
  content: string;
  createdAt: string;
  status: AdminAiMessageStatus;
  authorLabel: string;
  jobId?: string | null;
  toolName?: string | null;
  errorMessage?: string | null;
}

export interface AdminAiToolTrace {
  id: string;
  label: string;
  toolName: string;
  status: AdminAiTraceStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  inputSummary?: string | null;
  outputSummary?: string | null;
}

export interface AdminAiJobProgress {
  completedSteps: number;
  totalSteps: number;
  label: string;
}

export interface AdminAiJob {
  id: string;
  title: string;
  status: AdminAiJobStatus;
  kind: "chat" | "analysis" | "generation" | "review";
  summary: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  model?: string | null;
  errorMessage?: string | null;
  progress?: AdminAiJobProgress | null;
  traces: AdminAiToolTrace[];
}

export interface AdminAiThreadDetail extends AdminAiThreadSummary {
  messages: AdminAiMessage[];
  jobs: AdminAiJob[];
}

export interface AdminAiCreateThreadInput {
  title?: string;
  scope?: Partial<AdminAiWorkspaceScope>;
}

export interface AdminAiUpdateThreadInput {
  title?: string;
  status?: Extract<AdminAiThreadStatus, "idle" | "archived">;
}

export interface AdminAiSendMessageInput {
  content: string;
  scope?: Partial<AdminAiWorkspaceScope>;
}
