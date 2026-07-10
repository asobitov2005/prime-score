import type {
  TestCardAttemptSummary,
  TestCatalogItem,
} from "@/lib/types";

export interface StartTestModalProps {
  test: TestCatalogItem;
  activeAttempt?: TestCardAttemptSummary;
  completedAttempt?: TestCardAttemptSummary;
  compactAction?: boolean;
  unlockLabel?: string;
  startLabel?: string;
  continueLabel?: string;
  reviewLabel?: string;
  buttonClassName?: string;
}

export type StartTestMode = "exam" | "practice";

export interface StartTestModalController {
  test: TestCatalogItem;
  activeAttempt?: TestCardAttemptSummary;
  completedAttempt?: TestCardAttemptSummary;
  compactAction: boolean;
  buttonClassName?: string;
  mounted: boolean;
  open: boolean;
  showPremiumModal: boolean;
  showRules: boolean;
  isSubmitting: boolean;
  startError: string | null;
  isAuthenticated: boolean;
  isLockedPremium: boolean;
  isResumeOrReviewAction: boolean;
  actionVariant: "default" | "outline";
  actionLabel: string;
  loadingLabel: string;
  effectiveUnlockLabel: string;
  effectiveReviewLabel: string;
  subscriptionHref: string;
  resumeOrReviewButtonClassName: string;
  closeChoiceDialog: () => void;
  closePremiumModal: () => void;
  closeRulesDialog: () => void;
  handleClick: () => void;
  handleStartExamChoice: () => void;
  openReview: (attempt: TestCardAttemptSummary) => void;
  startTest: (mode: StartTestMode) => void;
}
