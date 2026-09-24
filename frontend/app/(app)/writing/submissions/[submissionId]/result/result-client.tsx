"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardList,
  FileText, Loader2, ShieldCheck, Sparkles, Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WritingResultFailure } from "@/components/writing/writing-result-failure";
import { writingInputRejection } from "@/lib/writing-feedback";
import { WritingResultReport } from "@/components/writing/writing-result-report";
import {
  fetchWritingSubmissionResult, pollWritingSubmission, retryWritingSubmission,
} from "@/lib/client-writing";
import { cn } from "@/lib/utils";
import type { WritingSubmissionResult, WritingSubmissionStatus } from "@/lib/server-writing";

interface ResultClientProps {
  submissionId: string;
  initialStatus: WritingSubmissionStatus;
  initialErrorMessage: string | null;
  initialResult: WritingSubmissionResult | null;
}

type LoadingStage = "idle" | "polling" | "loading_result" | "ready" | "failed";

const GRADING_STEPS = [
  { id: "reading", label: "Reading your essay", icon: BookOpen },
  { id: "task", label: "Task achievement", icon: Target },
  { id: "coherence", label: "Coherence & cohesion", icon: ArrowRight },
  { id: "lexical", label: "Lexical resource", icon: Sparkles },
  { id: "grammar", label: "Grammatical range & accuracy", icon: ClipboardList },
  { id: "compile", label: "Compiling feedback", icon: FileText },
];
// Give the rubric checks room to breathe while keeping the final assembly step
// short. The last step is activated by the completed event, not by this timer.
const GRADING_STEP_DELAYS_MS = [7000, 7000, 6500, 6500, 6000] as const;

function GradingScreen({ stage, activeStep }: { stage: LoadingStage; activeStep: number }) {
  const currentStep = GRADING_STEPS[Math.min(activeStep, GRADING_STEPS.length - 1)] ?? GRADING_STEPS[0];
  const CurrentIcon = currentStep.icon;
  const progress = Math.min(100, Math.max(8, ((activeStep + 0.72) / GRADING_STEPS.length) * 100));
  const statusCopy = stage === "loading_result"
    ? "Your feedback is being assembled into a clear, useful report."
    : "We’re checking your response against the IELTS writing rubric.";

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Card className="relative overflow-hidden rounded-[28px] border-border/60 bg-card shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <CardContent className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.82fr)] lg:gap-12 lg:p-10">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <span className="absolute inset-0 animate-ping rounded-2xl bg-violet-500/10" />
                <Loader2 className="relative h-5 w-5 animate-spin" />
              </span>
              <Badge tone="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300">
                Writing review
              </Badge>
            </div>

            <h1 className="mt-6 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-4xl">
              Your essay is being read with care.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {statusCopy} Your final report will bring the score, evidence, and next steps together in one place.
            </p>

            <div className="mt-8 max-w-xl rounded-2xl border border-border/60 bg-muted/20 p-4" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span>Review in progress</span>
                <span>Quietly reviewing</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-400 transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <CurrentIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{currentStep.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{stage === "loading_result" ? "Polishing your feedback..." : "This step is happening quietly in the background."}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  In progress
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border/60 bg-muted/15 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Rubric review</p>
                <p className="mt-1 text-sm font-semibold text-foreground">A thoughtful check, not a quick guess.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-5 space-y-1.5">
              {GRADING_STEPS.map((step, idx) => {
                const isActive = idx === activeStep;
                const isDone = idx < activeStep;
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors",
                      isActive && "bg-violet-500/10",
                      isDone && "text-emerald-700 dark:text-emerald-300",
                      !isActive && !isDone && "text-muted-foreground",
                    )}
                  >
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      isDone && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                      isActive && "bg-violet-500 text-white shadow-sm",
                      !isActive && !isDone && "bg-muted text-muted-foreground",
                    )}>
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn("min-w-0 truncate text-xs font-medium", isActive && "font-semibold text-violet-800 dark:text-violet-200")}>{step.label}</span>
                    {isDone ? <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Done</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 px-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        Your draft stays private while your feedback is prepared.
      </div>
    </div>
  );
}

export function WritingResultClient({
  submissionId,
  initialStatus,
  initialErrorMessage,
  initialResult,
}: ResultClientProps) {
  const initialStage = useMemo<LoadingStage>(() => {
    const status = String(initialStatus ?? "").toLowerCase();
    if (initialResult) return "ready";
    if (status === "failed") return "failed";
    return "polling";
  }, [initialStatus, initialResult]);

  const [stage, setStage] = useState<LoadingStage>(initialStage);
  const [result, setResult] = useState<WritingSubmissionResult | null>(initialResult);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage);
  const [activeStep, setActiveStep] = useState(0);
  const [sseAvailable, setSseAvailable] = useState(true);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (stage === "ready" || stage === "failed") return;
    if (activeStep >= GRADING_STEPS.length - 1) return;
    // Do not park the UI on "Compiling feedback" while the backend is still
    // working. That final step is set when the completed event arrives.
    if (activeStep >= GRADING_STEPS.length - 2 && stage !== "loading_result") return;

    const delay = GRADING_STEP_DELAYS_MS[Math.min(activeStep, GRADING_STEP_DELAYS_MS.length - 1)] ?? 6000;

    const timer = setTimeout(() => {
      setActiveStep((prev) => Math.min(GRADING_STEPS.length - 1, prev + 1));
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [activeStep, stage]);

  useEffect(() => {
    if (stage === "ready" || stage === "failed" || !sseAvailable) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setSseAvailable(false);
      return;
    }

    const events = new EventSource(`/internal-api/writing/submissions/${submissionId}/events`);

    events.onmessage = async (event) => {
      const payload = JSON.parse(event.data) as {
        status?: string;
        stepIndex?: number;
        errorMessage?: string | null;
      };
      const status = String(payload.status ?? "").toLowerCase();
      if (typeof payload.stepIndex === "number") {
        const nextStep = Math.max(0, Math.min(payload.stepIndex, GRADING_STEPS.length - 1));
        setActiveStep((prev) => Math.max(prev, nextStep));
      }

      if (status === "completed") {
        setStage("loading_result");
        setActiveStep(GRADING_STEPS.length - 1);
        try {
          const resultPayload = await fetchWritingSubmissionResult(submissionId);
          setResult(resultPayload);
          setStage("ready");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load writing result.");
          setStage("failed");
        } finally {
          events.close();
        }
        return;
      }

      if (status === "failed") {
        setErrorMessage(payload.errorMessage ?? "Writing evaluation failed.");
        setStage("failed");
        events.close();
        return;
      }

      setStage(status === "queued" ? "polling" : "loading_result");
    };

    events.onerror = () => {
      events.close();
      setSseAvailable(false);
      setStage((current) => (current === "ready" || current === "failed" ? current : "polling"));
    };

    return () => {
      events.close();
    };
  }, [stage, submissionId, sseAvailable]);

  useEffect(() => {
    if (sseAvailable || stage === "ready" || stage === "failed") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const data = await pollWritingSubmission(submissionId);
        const status = String(data.status ?? "").toLowerCase();
        if (cancelled) return;
        if (status === "completed") {
          setStage("loading_result");
          setActiveStep(GRADING_STEPS.length - 1);
          const payload = await fetchWritingSubmissionResult(submissionId);
          if (!cancelled) {
            setResult(payload);
            setStage("ready");
          }
          return;
        }
        if (status === "failed") {
          if (!cancelled) {
            setErrorMessage(data.error_message ?? null);
            setStage("failed");
          }
          return;
        }
        timer = setTimeout(poll, 3000);
      } catch (err) {
        if (cancelled) return;
        timer = setTimeout(poll, 4500);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sseAvailable, stage, submissionId]);

  const handleRetry = async () => {
    if (retrying || writingInputRejection(errorMessage)) return;
    setRetrying(true);
    setErrorMessage(null);
    try {
      await retryWritingSubmission(submissionId);
      setResult(null);
      setActiveStep(0);
      setSseAvailable(true);
      setStage("polling");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Retry failed.");
      setStage("failed");
    } finally {
      setRetrying(false);
    }
  };

  if (stage === "failed") {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <WritingResultFailure message={errorMessage} onRetry={handleRetry} retrying={retrying} />
      </div>
    );
  }

  if (stage !== "ready" || !result) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <GradingScreen stage={stage} activeStep={activeStep} />
      </div>
    );
  }

  return <WritingResultReport key={result.submission_id} result={result} />;
}
