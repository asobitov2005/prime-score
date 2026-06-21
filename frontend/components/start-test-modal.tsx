"use client";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Play, TimerReset, X, ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import type { TestCardAttemptSummary, TestCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { buildExamStartHref } from "@/lib/exam-start";

interface StartTestModalProps {
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

export function StartTestModal({
  test,
  activeAttempt,
  completedAttempt,
  compactAction = false,
  unlockLabel,
  startLabel,
  continueLabel,
  reviewLabel,
  buttonClassName,
}: StartTestModalProps) {
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
  const actionLabel = activeAttempt ? effectiveContinueLabel : completedAttempt ? "Retake Test" : effectiveStartLabel;
  const loadingLabel = activeAttempt ? "Opening..." : "Starting...";
  const isResumeOrReviewAction = !isLockedPremium && Boolean(activeAttempt || completedAttempt);
  const actionVariant = isLockedPremium || isResumeOrReviewAction ? "outline" : "default";
  const resumeOrReviewButtonClassName =
    "border-orange-300 bg-orange-100 text-orange-700 shadow-none hover:border-orange-400 hover:bg-orange-200 hover:text-orange-800 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:border-orange-500/45 dark:hover:bg-orange-500/22 dark:hover:text-orange-100";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open || showPremiumModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open, showPremiumModal]);

  function requestExamFullscreen() {
    if (typeof document === "undefined" || document.fullscreenElement) {
      return;
    }

    void document.documentElement.requestFullscreen().catch(() => undefined);
  }

  function openAttempt(attempt: TestCardAttemptSummary) {
    const resumeToken = Date.now();
    setIsSubmitting(true);
    setOpen(false);
    const href = test.type === "reading"
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

      const href = test.type === "reading"
        ? `/exam-preview/reading?testId=${test.id}&mode=guest`
        : `/exam-preview/listening?testId=${test.id}&mode=guest`;
      emitNavigationStart(href);
      router.push(href);
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

  function getPreviewHref(mode: "exam" | "practice" | "guest") {
    return test.type === "reading"
      ? `/exam-preview/reading?testId=${test.id}&mode=${mode}`
      : `/exam-preview/listening?testId=${test.id}&mode=${mode}`;
  }

  function openPreviewFallback(mode: "exam" | "practice" | "guest") {
    const href = getPreviewHref(mode);
    setOpen(false);
    setShowRules(false);
    emitNavigationStart(href);
    router.push(href);
  }

  function startTest(mode: "exam" | "practice") {
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

  const TestModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/50 bg-background/80 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">

        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          aria-label={"Close"}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 md:p-8 space-y-6 pt-8 md:pt-10">
          {startError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {startError}
            </div>
          ) : null}
          <div className="flex justify-between items-start pr-8">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md shadow-sm",
                  test.type === "reading" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  {test.type}
                </span>
                <span className="bg-muted/50 text-muted-foreground px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border border-border/50">
                  Full Test
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{test.title}</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="group relative border-border/60 bg-card/40 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
              <CardHeader className="pt-6 pb-3 items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 shadow-sm">
                  <TimerReset className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">{"Practice Mode"}</CardTitle>
              </CardHeader>
              <CardContent className="pb-6 px-5 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs font-medium text-muted-foreground/90 mb-5 text-left">
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Flexible practice"}</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Timer available"}</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Pause allowed"}</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Review with less pressure"}</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Best for learning"}</li>
                </ul>
                <Button disabled={isSubmitting} onClick={() => startTest("practice")} className="w-full h-10 rounded-lg font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition-all group-hover:-translate-y-0.5 mt-auto border-0 z-10 relative">
                  {isSubmitting ? "Starting..." : "Start Practice"}
                </Button>
              </CardContent>
            </Card>

            <Card className="group relative border-border/60 bg-card/40 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm z-10 font-mono">{"Strict"}</div>
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
              <CardHeader className="pt-6 pb-3 items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 shadow-sm">
                  <Play className="h-6 w-6 fill-current" />
                </div>
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">{"Strict Exam Mode"}</CardTitle>
              </CardHeader>
              <CardContent className="pb-6 px-5 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs font-medium text-muted-foreground/90 mb-5 text-left">
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Real exam conditions"}</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Full timer"}</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"No pause"}</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Tab switching may end test"}</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> {"Realistic simulation"}</li>
                </ul>
                <Button variant="destructive" disabled={isSubmitting} onClick={handleStartExamChoice} className="w-full h-10 rounded-lg font-bold text-sm shadow-md shadow-red-500/20 transition-all group-hover:-translate-y-0.5 mt-auto border-0 z-10 relative">
                  {isAuthenticated ? "Select Exam Mode" : "Login for Exam Mode"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  const RulesModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in zoom-in-95 duration-300">
        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-400" />

        <div className="p-5 pt-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 mb-3">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{"Strict Exam Rules"}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {"This mode simulates a real exam. Focus is strictly monitored."}
            </p>
          </div>

          <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 text-center">{"Auto-submit triggers:"}</p>
            <ul className="space-y-2 text-xs font-medium text-foreground">
              <li className="flex items-start gap-2 leading-tight">
                <div className="mt-0.5 rounded-full bg-red-500/20 p-0.5 shrink-0"><X className="h-2.5 w-2.5 text-red-500" /></div>
                <span>{"Leaving Full Screen mode"}</span>
              </li>
              <li className="flex items-start gap-2 leading-tight">
                <div className="mt-0.5 rounded-full bg-red-500/20 p-0.5 shrink-0"><X className="h-2.5 w-2.5 text-red-500" /></div>
                <span>{"Switching Tabs or Windows"}</span>
              </li>
              <li className="flex items-start gap-2 leading-tight">
                <div className="mt-0.5 rounded-full bg-red-500/20 p-0.5 shrink-0"><X className="h-2.5 w-2.5 text-red-500" /></div>
                <span>{"Opening other apps over the test"}</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              disabled={isSubmitting}
              onClick={() => void startTest("exam")}
              className="h-10 w-full rounded-xl bg-foreground text-background font-bold hover:bg-foreground/90 transition-all text-sm shadow-sm"
            >
              {isSubmitting ? "Starting..." : "I understand, start test"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowRules(false)}
              className="h-10 w-full rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              {"Back"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {compactAction && completedAttempt && !activeAttempt && !isLockedPremium ? (
        <Button
          onClick={() => openReview(completedAttempt)}
          size="sm"
          variant="outline"
          className={cn(
            "w-full h-9 text-xs font-bold rounded-lg shadow-sm group/btn transition-all active:scale-95",
            buttonClassName,
            resumeOrReviewButtonClassName,
          )}
        >
          {effectiveReviewLabel}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      ) : completedAttempt && !activeAttempt && !isLockedPremium ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => openReview(completedAttempt)}
            size="sm"
            className="h-9 text-xs font-bold rounded-lg shadow-sm group/btn transition-all active:scale-95"
          >
            {effectiveReviewLabel}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
          </Button>
          <Button
            onClick={handleClick}
            size="sm"
            variant="outline"
            className="h-9 text-xs font-bold rounded-lg transition-all active:scale-95"
          >
            {isSubmitting ? loadingLabel : "Try Again"}
          </Button>
        </div>
      ) : (
        <Button onClick={handleClick} size="sm" variant={actionVariant} className={cn(
          "w-full h-9 text-xs font-bold rounded-lg shadow-sm group/btn transition-all active:scale-95",
          buttonClassName,
          isResumeOrReviewAction && resumeOrReviewButtonClassName,
          isLockedPremium && "border-orange-200 bg-white text-orange-600 shadow-none hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-500/30 dark:bg-slate-950/40 dark:text-orange-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200",
        )}>
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
      )}

      {mounted && open && createPortal(<TestModal />, document.body)}
      {mounted && showPremiumModal && createPortal(
        <PremiumUpgradeModal subscriptionHref={subscriptionHref} onClose={() => setShowPremiumModal(false)} />,
        document.body
      )}
      {mounted && showRules && createPortal(<RulesModal />, document.body)}
    </>
  );
}
