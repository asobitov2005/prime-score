"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { AlertTriangle, Expand, FileText, ImageIcon, Loader2, Moon, SendHorizontal, Shrink, SunMedium, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExamPreviewAccessGate } from "@/components/exam/exam-preview-access-gate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteWritingDraftClient,
  getStoredDesiredScore,
  getWritingDraftClient,
  saveWritingDraftClient,
  submitWritingSubmission,
  uploadWritingImage,
} from "@/lib/client-writing";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

type WritingTaskType = "task_1" | "task_2";

interface ExamWritingTask {
  id: string;
  title: string;
  task_type: WritingTaskType;
  prompt_html: string;
  image_url: string | null;
  word_minimum: number;
  time_limit_seconds: number;
  source: string | null;
}

interface WritingDraftRecord {
  topic?: string;
  essay?: string;
  imageDataUrl?: string | null;
  started?: boolean;
  timeSpentSeconds?: number;
}

interface DraftPayload {
  task_id: string | null;
  task_type: WritingTaskType;
  topic: string;
  essay_text: string;
  image_data_url: string | null;
  started: boolean;
  time_spent_seconds: number;
}

const TASK_CONFIG: Record<WritingTaskType, { label: string; words: number; seconds: number; instruction: string }> = {
  task_1: {
    label: "Task 1",
    words: 150,
    seconds: 20 * 60,
    instruction: "You should spend about 20 minutes on this task. Write at least 150 words.",
  },
  task_2: {
    label: "Task 2",
    words: 250,
    seconds: 40 * 60,
    instruction: "You should spend about 40 minutes on this task. Write at least 250 words.",
  },
};

const TASK_1_SUMMARY_INSTRUCTION =
  "Summarize the information by selecting and reporting the main features, and make comparisons where relevant.";
const MIN_DRAFT_WORDS = 20;

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePromptText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function hasSummaryInstruction(value: string): boolean {
  return normalizePromptText(value).includes(normalizePromptText(TASK_1_SUMMARY_INSTRUCTION));
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function WritingExamClient({
  task,
  taskType,
  draftKey,
}: {
  task: ExamWritingTask | null;
  taskType: WritingTaskType;
  draftKey?: string | null;
}) {
  const router = useRouter();
  const resolvedTaskType = task?.task_type ?? taskType;
  const config = TASK_CONFIG[resolvedTaskType];
  const wordMinimum = task?.word_minimum ?? config.words;
  const timeLimitSeconds = task?.time_limit_seconds ?? config.seconds;
  const storageKey = task ? `writing-exam-draft:${task.id}` : (draftKey || `writing-exam-draft:custom:${resolvedTaskType}`);

  const [isStarted, setIsStarted] = useState(true);
  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [draftImageDataUrl, setDraftImageDataUrl] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasAcknowledgedTimeUp, setHasAcknowledgedTimeUp] = useState(false);
  const essayRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedRef = useRef<number>(0);
  const latestDraftRef = useRef<DraftPayload | null>(null);
  const draftPersistedRef = useRef(false);
  const storedCandidateName = useAuthStore((state) => state.name);
  const hasHydratedAuth = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const candidateName = hasHydratedAuth ? (storedCandidateName || "Guest Candidate") : "Guest Candidate";

  const updateTheme = useCallback((nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    try {
      window.localStorage.setItem("prime-theme", nextTheme);
    } catch {}
    document.documentElement.classList.add(nextTheme);
    document.documentElement.classList.remove(nextTheme === "light" ? "dark" : "light");
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  }, []);

  const handlePaneWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("textarea, input, select, [contenteditable='true']")
    ) {
      return;
    }

    const pane = event.currentTarget;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }

    const canScrollDown = delta > 0 && pane.scrollTop + pane.clientHeight < pane.scrollHeight - 1;
    const canScrollUp = delta < 0 && pane.scrollTop > 0;

    if (!canScrollDown && !canScrollUp) {
      return;
    }

    pane.scrollTop += delta;
    event.stopPropagation();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDraft() {
      setSecondsRemaining(timeLimitSeconds);
      setElapsed(0);
      setIsStarted(true);
      setImageFile(null);
      setDraftImageDataUrl(null);
      setSubmitError(null);
      setSyncState("idle");
      setHasAcknowledgedTimeUp(false);

      let localDraft: WritingDraftRecord | null = null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          localDraft = JSON.parse(raw) as WritingDraftRecord;
          if (!task) {
            setTopic(localDraft.topic ?? "");
          }
          setEssay(localDraft.essay ?? "");
          setDraftImageDataUrl(localDraft.imageDataUrl ?? null);
        } else {
          setTopic("");
          setEssay("");
        }
      } catch {
        setTopic("");
        setEssay("");
      }

      try {
        const remoteDraft = await getWritingDraftClient(storageKey);
        if (cancelled) return;
        if (!task) {
          setTopic(remoteDraft.topic || localDraft?.topic || "");
        }
        setEssay(remoteDraft.essay_text || localDraft?.essay || "");
        setDraftImageDataUrl(remoteDraft.image_data_url ?? localDraft?.imageDataUrl ?? null);
        setElapsed(remoteDraft.time_spent_seconds ?? 0);
        setSecondsRemaining(Math.max(0, timeLimitSeconds - (remoteDraft.time_spent_seconds ?? 0)));
        setIsStarted(true);
        draftPersistedRef.current = true;
        setSyncState("saved");
      } catch {
        if (cancelled) return;
        if (localDraft) {
          setTopic(task ? "" : localDraft.topic ?? "");
          setEssay(localDraft.essay ?? "");
          setDraftImageDataUrl(localDraft.imageDataUrl ?? null);
          setSecondsRemaining(Math.max(0, timeLimitSeconds - (localDraft.timeSpentSeconds ?? 0)));
          setElapsed(localDraft.timeSpentSeconds ?? 0);
          setIsStarted(true);
          setSyncState("saved");
        } else {
          draftPersistedRef.current = false;
          setSyncState("idle");
        }
      }
    }

    void hydrateDraft();
    return () => {
      cancelled = true;
    };
  }, [storageKey, task, timeLimitSeconds]);

  useEffect(() => {
    const savedTheme = (() => {
      try {
        return window.localStorage.getItem("prime-theme") as "light" | "dark" | null;
      } catch {
        return null;
      }
    })();
    const nextTheme = savedTheme ?? "light";
    updateTheme(nextTheme);

    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, [updateTheme]);

  useEffect(() => {
    if (!imageFile) return;
    const nextUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(nextUrl);
    const reader = new FileReader();
    reader.onload = () => {
      setDraftImageDataUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(imageFile);

    return () => URL.revokeObjectURL(nextUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(draftImageDataUrl);
    }
  }, [draftImageDataUrl, imageFile]);

  useEffect(() => {
    if (!isStarted || timeLimitSeconds <= 0) return;

    const id = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isStarted, timeLimitSeconds]);

  useEffect(() => {
    latestDraftRef.current = {
      task_id: task?.id ?? null,
      task_type: resolvedTaskType,
      topic: task ? "" : topic,
      essay_text: essay,
      image_data_url: draftImageDataUrl,
      started: isStarted,
      time_spent_seconds: elapsed,
    };
  }, [draftImageDataUrl, elapsed, essay, isStarted, resolvedTaskType, task, topic]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSavedRef.current > 4500) {
        const payload = latestDraftRef.current;
        if (!payload) return;
        const draftWords = countWords(payload.essay_text);
        try {
          if (draftWords < MIN_DRAFT_WORDS) {
            window.localStorage.removeItem(storageKey);
            if (draftPersistedRef.current) {
              void deleteWritingDraftClient(storageKey).finally(() => {
                draftPersistedRef.current = false;
              });
            }
            setSyncState("idle");
            lastSavedRef.current = now;
            return;
          }

          setSyncState("saving");
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({
              topic: payload.topic,
              essay: payload.essay_text,
              imageDataUrl: payload.image_data_url,
              started: payload.started,
              timeSpentSeconds: payload.time_spent_seconds,
            } satisfies WritingDraftRecord),
          );
          void saveWritingDraftClient(storageKey, payload)
            .then(() => {
              draftPersistedRef.current = true;
              setSyncState("saved");
            })
            .catch(() => {
              setSyncState("error");
            });
          lastSavedRef.current = now;
        } catch {
          setSyncState("error");
        }
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [storageKey]);

  const wordCount = useMemo(() => countWords(essay), [essay]);
  const minDraftWords = Math.ceil(wordMinimum * 0.5);
  const hasPrompt = task ? true : topic.trim().length > 0;
  const canSubmit = isStarted && hasPrompt && wordCount >= minDraftWords;
  const hasReachedTimeLimit = isStarted && timeLimitSeconds > 0 && elapsed >= timeLimitSeconds;
  const showTimeUpDialog = hasReachedTimeLimit && !hasAcknowledgedTimeUp;
  const timerIsOvertime = hasReachedTimeLimit && hasAcknowledgedTimeUp;
  const timerDisplaySeconds = timerIsOvertime ? elapsed : secondsRemaining;

  const handleTopicChange = useCallback((value: string) => {
    setTopic(value);
    setSyncState("saving");
  }, []);

  const handleEssayChange = useCallback((value: string) => {
    setEssay(value);
    setSyncState("saving");
  }, []);

  const handleImageChange = useCallback((file: File | null) => {
    setImageFile(file);
    if (!file) {
      setDraftImageDataUrl(null);
    }
    setSyncState("saving");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isStarted || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let imageUrl: string | null = null;
      if (!task && resolvedTaskType === "task_1" && imageFile) {
        const upload = await uploadWritingImage(imageFile);
        imageUrl = upload.url;
      } else if (!task && resolvedTaskType === "task_1" && draftImageDataUrl) {
        const response = await fetch(draftImageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${storageKey}.png`, { type: blob.type || "image/png" });
        const upload = await uploadWritingImage(file);
        imageUrl = upload.url;
      }

      const result = await submitWritingSubmission({
        task_id: task?.id,
        task_type: task ? undefined : resolvedTaskType,
        topic: task ? undefined : topic.trim(),
        image_url: task ? undefined : imageUrl,
        essay_text: essay,
        time_spent_seconds: elapsed,
        desired_score: getStoredDesiredScore(),
      });

      try {
        window.localStorage.removeItem(storageKey);
      } catch {}
      void deleteWritingDraftClient(storageKey).catch(() => {});

      const href = `/writing/submissions/${result.id}/result`;
      emitNavigationStart(href);
      router.push(href);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit essay.");
      setIsSubmitting(false);
    }
  }, [canSubmit, draftImageDataUrl, elapsed, essay, imageFile, isStarted, isSubmitting, resolvedTaskType, router, storageKey, task, topic]);

  if (hasHydratedAuth && !isAuthenticated) {
    return <ExamPreviewAccessGate kind="writing" backHref="/writing" />;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border/80 bg-background/95 text-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mx-auto grid min-h-[68px] max-w-[1800px] grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/writing"
              className="flex h-10 items-center rounded-md transition hover:opacity-90"
              aria-label="Leave writing workspace"
              title="Leave writing workspace"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/exam-logo-lightmode.svg" alt="PrimeScore" className="h-8 w-auto dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/exam-logo-darkmode.svg" alt="PrimeScore" className="hidden h-8 w-auto dark:block" />
            </Link>
            <div className="min-w-0 border-l border-border pl-3">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Test Taker</p>
              <div className="flex items-center gap-2">
                <AutosaveCloud syncState={syncState} />
                <p className="truncate text-sm font-semibold text-foreground">{candidateName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div
              className={cn(
                "rounded-lg px-2 py-1 text-center transition-all",
                timerIsOvertime && "bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.16)]"
              )}
            >
              <p
                className={cn(
                  "text-[15px] font-bold leading-none tracking-[0.04em] transition-colors",
                  timerIsOvertime ? "text-red-600 dark:text-red-400" : "text-foreground"
                )}
              >
                {formatTime(timerDisplaySeconds)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="h-9 w-9 rounded-lg border-border/70 bg-background p-0"
              onClick={() => updateTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
              className="h-9 w-9 rounded-lg border-border/70 bg-background p-0"
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                "h-9 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.12em]",
                theme === "dark"
                  ? "border border-slate-400 bg-slate-300 text-slate-950 hover:bg-slate-200"
                  : "border border-border bg-muted/45 text-slate-700 hover:bg-muted/70"
              )}
            >
              {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
              {isSubmitting ? "Submitting" : "Submit"}
            </Button>
          </div>
        </div>
      </header>

      {showTimeUpDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/35 px-4 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-card/95 p-5 shadow-2xl shadow-black/15 animate-in slide-in-from-bottom-2 zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground">Time is up</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The recommended time for this task has ended. Continue writing or submit your answer now.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-4"
                onClick={() => setHasAcknowledgedTimeUp(true)}
              >
                Continue
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || isSubmitting}
                className="h-9 rounded-xl px-4"
              >
                {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
                {isSubmitting ? "Submitting" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(320px,43%)_minmax(0,57%)]">
        <section className="min-h-0 overflow-hidden border-b border-border/80 bg-background lg:flex lg:border-b-0 lg:border-r">
          <div
            onWheelCapture={handlePaneWheel}
            className="h-full min-h-0 overflow-y-auto py-5 pl-4 pr-5 overscroll-contain sm:pl-6 sm:pr-5"
          >
            <div className="space-y-6">
            <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 shadow-sm shadow-amber-500/10 dark:border-amber-400/35 dark:bg-amber-500/10">
              <p className="text-lg font-bold tracking-tight text-foreground">{config.label}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-100">{config.instruction}</p>
            </div>

            {task ? (
              <PresetPrompt task={task} />
            ) : (
              <CustomPrompt
                taskType={resolvedTaskType}
                topic={topic}
                onTopicChange={handleTopicChange}
                imageFile={imageFile}
                imagePreviewUrl={imagePreviewUrl}
                onImageChange={handleImageChange}
              />
            )}

          </div>
          </div>
        </section>

        <section className="min-h-0 overflow-hidden bg-background lg:flex lg:flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">Your Answer</p>
          </div>

          {submitError ? (
            <div className="mx-4 mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300 sm:mx-6">
              {submitError}
            </div>
          ) : null}

          <div
            onWheelCapture={handlePaneWheel}
            className="flex flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-2 overscroll-contain sm:px-6 sm:pb-6 sm:pt-2"
            style={{ scrollbarGutter: "stable" }}
          >
            <Textarea
              ref={essayRef}
              value={essay}
              onChange={(event) => handleEssayChange(event.target.value)}
              placeholder="Start writing your answer here"
              className="h-full min-h-[480px] flex-1 overflow-y-auto resize-none rounded-lg border-border/70 bg-background px-5 py-4 text-[15px] leading-7 focus-visible:border-amber-300/60 focus-visible:ring-2 focus-visible:ring-amber-300/15 lg:min-h-0"
            />
          </div>
          <div className="relative z-10 -mt-5 px-4 pb-4 pt-0 sm:px-6">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <FileText className="h-4 w-4" />
              Words: <span className="tabular-nums text-foreground">{wordCount}</span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function AutosaveCloud({ syncState }: { syncState: "idle" | "saving" | "saved" | "error" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 flex-none items-center justify-center",
        syncState === "error"
          ? "text-red-500"
          : syncState === "saving"
            ? "animate-pulse text-primary"
            : "text-primary"
      )}
      title={
        syncState === "error"
          ? "Save failed"
          : syncState === "saving"
            ? "Saving changes"
            : syncState === "saved"
              ? "Saved"
              : "Autosave ready"
      }
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6.5 18.25C4.01 18.25 2 16.24 2 13.75C2 11.49 3.67 9.62 5.84 9.31C6.6 6.77 8.95 5 11.75 5C15.19 5 18 7.81 18 11.25V11.5H18.5C20.43 11.5 22 13.07 22 15C22 16.93 20.43 18.5 18.5 18.5H6.5V18.25Z"
          className="stroke-current"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {syncState === "error" ? (
          <path
            d="M10.1 10.1L13.9 13.9M13.9 10.1L10.1 13.9"
            className="stroke-current"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : syncState === "saving" ? (
          <path
            d="M8.5 13.1L10.2 14.8L13.1 11.9"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
        ) : (
          <path
            d="M8.5 13.1L10.2 14.8L13.1 11.9"
            className="stroke-emerald-500"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

function PresetPrompt({ task }: { task: ExamWritingTask }) {
  const titleText = normalizePromptText(task.title);
  const promptText = normalizePromptText(stripHtml(task.prompt_html));
  const promptRepeatsTitle =
    promptText === titleText ||
    promptText.startsWith(`${titleText} `) ||
    titleText.startsWith(`${promptText} `);
  const shouldRenderPromptHtml = Boolean(promptText) && !promptRepeatsTitle;
  const shouldRenderSummaryInstruction =
    task.task_type === "task_1" &&
    !hasSummaryInstruction(task.title) &&
    !hasSummaryInstruction(stripHtml(task.prompt_html));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{task.title}</h2>
        {task.source ? <p className="text-xs font-medium text-muted-foreground">{task.source}</p> : null}
      </div>

      <div className="space-y-2">
        {shouldRenderPromptHtml ? (
          <div
            className="prose max-w-none text-[17px] font-semibold leading-7 text-foreground prose-p:my-2 prose-p:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: task.prompt_html }}
          />
        ) : null}
        {shouldRenderSummaryInstruction ? (
          <p className="text-base font-semibold italic leading-6 text-foreground">
            {TASK_1_SUMMARY_INSTRUCTION}
          </p>
        ) : null}
      </div>

      {task.image_url ? (
        <div className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={task.image_url}
            alt={task.title}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            className="max-h-[680px] w-full select-none object-contain"
          />
        </div>
      ) : task.task_type === "task_1" ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <ImageIcon className="h-7 w-7 opacity-60" />
        </div>
      ) : null}
    </div>
  );
}

function CustomPrompt({
  taskType,
  topic,
  onTopicChange,
  imageFile,
  imagePreviewUrl,
  onImageChange,
}: {
  taskType: WritingTaskType;
  topic: string;
  onTopicChange: (value: string) => void;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  onImageChange: (file: File | null) => void;
}) {
  if (taskType === "task_1") {
    const shouldRenderSummaryInstruction = !hasSummaryInstruction(topic);

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="whitespace-pre-wrap text-[17px] font-semibold leading-7 text-foreground">
            {topic}
          </p>
          {shouldRenderSummaryInstruction ? (
            <p className="text-base font-semibold italic leading-6 text-foreground">
              {TASK_1_SUMMARY_INSTRUCTION}
            </p>
          ) : null}
        </div>

        <div>
          {imagePreviewUrl ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt={imageFile?.name ?? "Task 1 visual"}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                className="max-h-[680px] w-full select-none object-contain"
              />
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
              <UploadCloud className="h-6 w-6" />
              <span className="font-medium text-foreground">Upload chart, graph, map, or process image</span>
              <span className="text-xs">PNG, JPG, or WebP under 10 MB</span>
              <Input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Textarea
          id="exam-writing-topic"
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder="Paste the Task 2 essay question here."
          className="min-h-[160px] rounded-lg border-border/70 bg-background px-4 py-3 text-sm leading-6"
        />
      </div>
    </div>
  );
}
