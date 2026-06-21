"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Play, TimerReset, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttemptMode, TestCatalogItem, TestType } from "@/lib/types";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { cn } from "@/lib/utils";
import { buildExamStartHref } from "@/lib/exam-start";

interface HistoryRetakeButtonProps {
  testId: string;
  testType: TestType;
  mode: AttemptMode;
  idleLabel?: string;
  loadingLabel?: string;
  className?: string;
  showModeChooser?: boolean;
  testTitle?: string | null;
  testFormat?: TestCatalogItem["format"] | string | null;
}

export function HistoryRetakeButton({
  testId,
  testType,
  mode,
  idleLabel = "Retake",
  loadingLabel = "Starting...",
  className,
  showModeChooser = false,
  testTitle,
  testFormat,
}: HistoryRetakeButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isFullTest = !testFormat || testFormat === "full";
  const shouldShowModeChooser = showModeChooser && isFullTest;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  function retake(selectedMode = mode) {
    setIsStarting(true);
    setOpen(false);
    const href = buildExamStartHref({
      testType,
      testId,
      scope: "full",
      mode: isFullTest ? selectedMode : "practice",
      forceNew: true,
    });
    emitNavigationStart(href);
    router.push(href);
  }

  const modal = mounted && open
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/50 bg-background/90 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in zoom-in-95 duration-300">
            <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-6 p-6 pt-8 md:p-8 md:pt-10">
              <div className="space-y-1.5 pr-8">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                    testType === "reading" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500",
                  )}>
                    {testType}
                  </span>
                  <span className="rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Full Test
                  </span>
                </div>
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                  {testTitle ?? "Try again"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to retake this test.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="group relative flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-sm transition-all">
                  <div className="absolute left-0 top-0 h-1 w-full bg-primary/20" />
                  <CardHeader className="items-center pb-3 pt-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm transition-all duration-300 group-hover:scale-105">
                      <TimerReset className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-bold tracking-tight text-foreground">Practice Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between px-5 pb-6">
                    <ul className="mb-5 space-y-2.5 text-left text-xs font-medium text-muted-foreground/90">
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> Flexible practice experience</li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> You can pause and continue later</li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> Best for learning and review</li>
                    </ul>
                    <Button
                      disabled={isStarting}
                      onClick={() => retake("practice")}
                      className="h-10 w-full rounded-lg border-0 bg-emerald-600 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 dark:text-slate-950"
                    >
                      {isStarting ? loadingLabel : "Start Practice"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="group relative flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-sm transition-all">
                  <div className="absolute right-0 top-0 z-10 rounded-bl-xl bg-red-500 px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-white shadow-sm">Strict</div>
                  <div className="absolute left-0 top-0 h-1 w-full bg-red-500/20" />
                  <CardHeader className="items-center pb-3 pt-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 shadow-sm transition-all duration-300 group-hover:scale-105">
                      <Play className="h-6 w-6 fill-current" />
                    </div>
                    <CardTitle className="text-lg font-bold tracking-tight text-foreground">Strict Exam Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between px-5 pb-6">
                    <ul className="mb-5 space-y-2.5 text-left text-xs font-medium text-muted-foreground/90">
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" /> Real exam conditions</li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" /> Full timer and no pause</li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" /> Leaving the exam may submit it</li>
                    </ul>
                    <Button
                      variant="destructive"
                      disabled={isStarting}
                      onClick={() => retake("exam")}
                      className="h-10 w-full rounded-lg border-0 text-sm font-bold shadow-md shadow-red-500/20 transition-all"
                    >
                      {isStarting ? loadingLabel : "Start Strict Exam"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isStarting}
        onClick={(event) => {
          event.stopPropagation();
          if (shouldShowModeChooser) {
            setOpen(true);
            return;
          }
          retake();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        className={cn(
          "h-9 rounded-lg border-border/70 bg-background px-3.5 text-[11px] font-bold text-foreground shadow-sm hover:bg-muted/40",
          className,
        )}
      >
        {isStarting ? loadingLabel : idleLabel}
      </Button>
      {modal}
    </>
  );
}
