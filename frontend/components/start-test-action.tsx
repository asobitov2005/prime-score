"use client";

import { ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { StartTestModalController } from "./start-test-modal-types";

interface StartTestActionProps {
  controller: StartTestModalController;
}

export function StartTestAction({ controller }: StartTestActionProps) {
  const {
    activeAttempt,
    completedAttempt,
    compactAction,
    buttonClassName,
    isLockedPremium,
    isSubmitting,
    isResumeOrReviewAction,
    actionVariant,
    actionLabel,
    loadingLabel,
    effectiveUnlockLabel,
    effectiveReviewLabel,
    resumeOrReviewButtonClassName,
    handleClick,
    openReview,
  } = controller;

  if (
    compactAction &&
    completedAttempt &&
    !activeAttempt &&
    !isLockedPremium
  ) {
    return (
      <Button
        onClick={() => openReview(completedAttempt)}
        size="sm"
        variant="outline"
        className={cn(
          "group/btn h-9 w-full rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95",
          buttonClassName,
          resumeOrReviewButtonClassName,
        )}
      >
        {effectiveReviewLabel}
        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
      </Button>
    );
  }

  if (completedAttempt && !activeAttempt && !isLockedPremium) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => openReview(completedAttempt)}
          size="sm"
          className="group/btn h-9 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          {effectiveReviewLabel}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
        </Button>
        <Button
          onClick={handleClick}
          size="sm"
          variant="outline"
          className="h-9 rounded-lg text-xs font-bold transition-all active:scale-95"
        >
          {isSubmitting ? loadingLabel : "Try Again"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant={actionVariant}
      className={cn(
        "group/btn h-9 w-full rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95",
        buttonClassName,
        isResumeOrReviewAction && resumeOrReviewButtonClassName,
        isLockedPremium &&
          "border-orange-200 bg-white text-orange-600 shadow-none hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-500/30 dark:bg-slate-950/40 dark:text-orange-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200",
      )}
    >
      {isLockedPremium ? (
        <>
          <Lock className="mr-1.5 h-3.5 w-3.5" />
          {effectiveUnlockLabel}
        </>
      ) : (
        <>
          {isSubmitting ? loadingLabel : actionLabel}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
        </>
      )}
    </Button>
  );
}
