"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { buildExamStartHref } from "@/lib/exam-start";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import type { TestCardAttemptSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

import type {
  StartTestModalController,
  StartTestModalProps,
  StartTestMode,
} from "./start-test-modal-types";

export function useStartTestModal(
  props: StartTestModalProps,
): StartTestModalController {
  const {
    test,
    activeAttempt,
    completedAttempt,
    compactAction = false,
    unlockLabel,
    startLabel,
    continueLabel,
    reviewLabel,
    buttonClassName,
  } = props;
  const router = useRouter();
  const { isPremium, isAuthenticated } = useAuthStore();
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);
  const isFullTest = !test.format || test.format === "full";
  const defaultSectionId = test.sections[0]?.id;
  const [open, setOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const isLockedPremium = test.accessType === "premium" && !isPremium;
  const effectiveUnlockLabel = unlockLabel ?? "Unlock";
  const effectiveStartLabel = startLabel ?? "Start Test";
  const effectiveContinueLabel = continueLabel ?? "Continue Test";
  const effectiveReviewLabel = reviewLabel ?? "Review";
  const actionLabel = activeAttempt
    ? effectiveContinueLabel
    : completedAttempt
      ? "Retake Test"
      : effectiveStartLabel;
  const loadingLabel = activeAttempt ? "Opening..." : "Starting...";
  const isResumeOrReviewAction =
    !isLockedPremium && Boolean(activeAttempt || completedAttempt);
  const actionVariant =
    isLockedPremium || isResumeOrReviewAction ? "outline" : "default";
  const resumeOrReviewButtonClassName =
    "border-orange-300 bg-orange-100 text-orange-700 shadow-none hover:border-orange-400 hover:bg-orange-200 hover:text-orange-800 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:border-orange-500/45 dark:hover:bg-orange-500/22 dark:hover:text-orange-100";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open || showPremiumModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open, showPremiumModal]);

  function openAttempt(attempt: TestCardAttemptSummary) {
    const resumeToken = Date.now();
    setIsSubmitting(true);
    setOpen(false);
    const href =
      test.type === "reading"
        ? `/exam-preview/reading?attemptId=${attempt.id}&mode=${attempt.mode}&resume=${resumeToken}`
        : `/exam-preview/listening?attemptId=${attempt.id}&mode=${attempt.mode}&resume=${resumeToken}`;
    emitNavigationStart(href);
    router.push(href);
  }

  function openReview(attempt: TestCardAttemptSummary) {
    setIsSubmitting(true);
    setOpen(false);
    const href = `/attempts/${attempt.id}/result`;
    emitNavigationStart(href);
    router.push(href);
  }

  function getPreviewHref(mode: StartTestMode | "guest") {
    return test.type === "reading"
      ? `/exam-preview/reading?testId=${test.id}&mode=${mode}`
      : `/exam-preview/listening?testId=${test.id}&mode=${mode}`;
  }

  function openPreviewFallback(mode: StartTestMode | "guest") {
    const href = getPreviewHref(mode);
    setOpen(false);
    setShowRules(false);
    emitNavigationStart(href);
    router.push(href);
  }

  function startTest(mode: StartTestMode) {
    const effectiveScope = isFullTest ? "full" : "section";
    const effectiveMode = isFullTest ? mode : "practice";
    setStartError(null);

    if (isLockedPremium) {
      setShowPremiumModal(true);
      return;
    }
    if (!isAuthenticated) {
      openPreviewFallback("guest");
      return;
    }

    setIsSubmitting(true);
    setOpen(false);
    setShowRules(false);
    const href = buildExamStartHref({
      testType: test.type,
      testId: test.id,
      scope: effectiveScope,
      mode: effectiveMode,
      sectionId: effectiveScope === "section" ? defaultSectionId : undefined,
      forceNew: Boolean(completedAttempt && !activeAttempt),
    });
    emitNavigationStart(href);
    router.push(href);
  }

  function handleClick() {
    setStartError(null);
    if (isLockedPremium) {
      setShowPremiumModal(true);
      return;
    }
    if (!isAuthenticated) {
      if (isFullTest) {
        setOpen(true);
        setShowRules(false);
        return;
      }
      openPreviewFallback("guest");
      return;
    }
    if (test.accessType === "premium" && !isPremium) {
      setShowPremiumModal(true);
    } else if (activeAttempt) {
      openAttempt(activeAttempt);
    } else if (!isFullTest) {
      void startTest("practice");
    } else {
      setOpen(true);
      setShowRules(false);
    }
  }

  function handleStartExamChoice() {
    if (!isAuthenticated) {
      emitNavigationStart("/login");
      router.push("/login");
      return;
    }
    setShowRules(true);
  }

  return {
    test,
    activeAttempt,
    completedAttempt,
    compactAction,
    buttonClassName,
    mounted,
    open,
    showPremiumModal,
    showRules,
    isSubmitting,
    startError,
    isAuthenticated,
    isLockedPremium,
    isResumeOrReviewAction,
    actionVariant,
    actionLabel,
    loadingLabel,
    effectiveUnlockLabel,
    effectiveReviewLabel,
    subscriptionHref,
    resumeOrReviewButtonClassName,
    closeChoiceDialog: () => setOpen(false),
    closePremiumModal: () => setShowPremiumModal(false),
    closeRulesDialog: () => setShowRules(false),
    handleClick,
    handleStartExamChoice,
    openReview,
    startTest,
  };
}
