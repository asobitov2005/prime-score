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

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type PaymentMethod = "payme" | "click" | "uzum" | "manual";

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
  price: string;
  discount: string;
  status: "active" | "draft";
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
  user: string;
  plan: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  updatedAt: string;
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
  accessType: TestAccessType;
  status: TestStatus;
  version: number;
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
  markerCount: number;
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
  // Block-based input fields
  questionBlock?: string;
  answerBlock?: string;
  secondaryBlock?: string; // Used for Headings, Features, etc.
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
