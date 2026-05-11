"use client";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Play, TimerReset, X, ArrowRight, Check, Gem, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TestCardAttemptSummary, TestCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { emitNavigationStart } from "@/lib/navigation-transition";

interface StartTestModalProps {
  test: TestCatalogItem;
  activeAttempt?: TestCardAttemptSummary;
  completedAttempt?: TestCardAttemptSummary;
}

export function StartTestModal({ test, activeAttempt, completedAttempt }: StartTestModalProps) {
  const router = useRouter();
  const { isPremium } = useAuthStore();
  const isFullTest = !test.format || test.format === "full";
  const defaultSectionId = test.sections[0]?.id;
  const [open, setOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const actionLabel = activeAttempt ? "Continue Test" : completedAttempt ? "Retake Test" : "Start Test";
  const loadingLabel = activeAttempt ? "Opening..." : "Starting...";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open || showPremiumModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open, showPremiumModal]);

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
    if (test.accessType === "premium" && !isPremium) {
      setShowPremiumModal(true);
    } else if (activeAttempt) {
      openAttempt(activeAttempt);
    } else if (!isFullTest) {
      void startTest("practice");
    } else {
      setOpen(true);
    }
  }

  async function startTest(mode: "exam" | "practice") {
    const effectiveScope = isFullTest ? "full" : "section";
    const effectiveMode = isFullTest ? mode : "practice";
    const payload = {
      testId: test.id,
      scope: effectiveScope,
      sectionId: effectiveScope === "section" ? defaultSectionId : undefined,
      mode: effectiveMode,
      forceNew: Boolean(completedAttempt && !activeAttempt),
    };
    try {
      setIsSubmitting(true);
      const response = await fetch("/internal-api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to start.");
      const result = (await response.json()) as { attemptId: string };
      const resumeToken = Date.now();
      setOpen(false);
      const href = test.type === "reading"
        ? `/exam-preview/reading?attemptId=${result.attemptId}&mode=${effectiveMode}&resume=${resumeToken}`
        : `/exam-preview/listening?attemptId=${result.attemptId}&mode=${effectiveMode}&resume=${resumeToken}`;
      emitNavigationStart(href);
      router.push(href);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const PremiumModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPremiumModal(false)}>
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] border border-amber-500/30 bg-background/90 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>

        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-56 h-56 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        <button
          onClick={() => setShowPremiumModal(false)}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <PrimePremiumIcon className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-foreground">Unlock Premium</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                This test requires a Premium subscription. Upgrade to access all premium content.
              </p>
            </div>
          </div>

          <div className="bg-card/50 rounded-xl border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <PrimePremiumIcon className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{test.title}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500">Premium Content</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Premium includes</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "All premium tests",
                "Detailed analytics",
                "Priority support",
                "Early access",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                  <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button asChild className="h-11 w-full rounded-xl bg-amber-500 font-bold text-white dark:text-slate-950 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/20 active:scale-95 transition-all">
              <Link href="/pricing">
                <PrimePremiumIcon className="mr-1.5 h-3.5 w-3.5" />
                Unlock Premium
              </Link>
            </Button>
            <button
              onClick={() => setShowPremiumModal(false)}
              className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const TestModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/50 bg-background/80 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">

        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 md:p-8 space-y-6 pt-8 md:pt-10">
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
              <h2 className="text-2xl font-black tracking-tight text-foreground leading-tight">{test.title}</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="group relative border-border/60 bg-card/40 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
              <CardHeader className="pt-6 pb-3 items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 shadow-sm">
                  <TimerReset className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Practice Mode</CardTitle>
              </CardHeader>
              <CardContent className="pb-6 px-5 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs font-medium text-muted-foreground/90 mb-5 text-left">
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Flexible practice</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Timer available</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Pause allowed</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Review with less pressure</li>
                  <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Best for learning</li>
                </ul>
                <Button disabled={isSubmitting} onClick={() => startTest("practice")} className="w-full h-10 rounded-lg font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition-all group-hover:-translate-y-0.5 mt-auto border-0 z-10 relative">
                  {isSubmitting ? "Starting..." : "Start Practice"}
                </Button>
              </CardContent>
            </Card>

            <Card className="group relative border-border/60 bg-card/40 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm z-10 font-mono">Strict</div>
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
              <CardHeader className="pt-6 pb-3 items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 shadow-sm">
                  <Play className="h-6 w-6 fill-current" />
                </div>
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Strict Exam Mode</CardTitle>
              </CardHeader>
              <CardContent className="pb-6 px-5 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs font-medium text-muted-foreground/90 mb-5 text-left">
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Real exam conditions</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Full timer</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> No pause</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Tab switching may end test</li>
                  <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Realistic simulation</li>
                </ul>
                <Button variant="destructive" disabled={isSubmitting} onClick={() => startTest("exam")} className="w-full h-10 rounded-lg font-bold text-sm shadow-md shadow-red-500/20 transition-all group-hover:-translate-y-0.5 mt-auto border-0 z-10 relative">
                  {isSubmitting ? "Starting..." : "Start Exam"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
              Redirection to workspace activated
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {completedAttempt && !activeAttempt ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => openReview(completedAttempt)}
            size="sm"
            className="h-9 text-xs font-bold rounded-lg shadow-sm group/btn transition-all active:scale-95"
          >
            Review Test
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
        <Button onClick={handleClick} size="sm" className={cn(
          "w-full h-9 text-xs font-bold rounded-lg shadow-sm group/btn transition-all active:scale-95",
          test.accessType === "premium" && !isPremium && "border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 shadow-none dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30"
        )}>
          {test.accessType === "premium" && !isPremium ? (
            <>
              <PrimePremiumIcon className="mr-1.5 h-3.5 w-3.5" />
              Unlock Premium
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
      {mounted && showPremiumModal && createPortal(<PremiumModal />, document.body)}
    </>
  );
}
