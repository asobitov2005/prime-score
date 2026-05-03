"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Clock3, ImageIcon, Loader2, Send, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submitWritingSubmission } from "@/lib/client-writing";
import { cn } from "@/lib/utils";

interface WorkspaceTask {
  id: string;
  title: string;
  task_type: "task_1" | "task_2";
  prompt_html: string;
  image_url: string | null;
  word_minimum: number;
  time_limit_seconds: number;
  difficulty: string | null;
  source: string | null;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function WritingTaskWorkspace({ task }: { task: WorkspaceTask }) {
  const router = useRouter();
  const storageKey = `writing-draft:${task.id}`;
  const [essay, setEssay] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(task.time_limit_seconds);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastSavedRef = useRef<number>(0);

  // Hydrate draft
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setEssay(raw);
    } catch {}
  }, [storageKey]);

  // Autosave every 5s
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSavedRef.current > 4500) {
        try {
          window.localStorage.setItem(storageKey, essay);
          lastSavedRef.current = now;
        } catch {}
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [essay, storageKey]);

  // Pause on tab blur
  useEffect(() => {
    const handler = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Timer
  useEffect(() => {
    if (isPaused) return;
    const id = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPaused]);

  const wordCount = useMemo(() => countWords(essay), [essay]);
  const minWords = task.word_minimum;
  const ratio = minWords > 0 ? wordCount / minWords : 0;
  const wordTone =
    ratio < 0.6 ? "text-rose-500" : ratio < 1 ? "text-amber-500" : "text-emerald-500";
  const wordBgTone =
    ratio < 0.6 ? "bg-rose-500/10" : ratio < 1 ? "bg-amber-500/10" : "bg-emerald-500/10";
  const canSubmit = wordCount >= Math.ceil(minWords * 0.5);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitWritingSubmission({
        task_id: task.id,
        essay_text: essay,
        time_spent_seconds: elapsed,
      });
      try {
        window.localStorage.removeItem(storageKey);
      } catch {}
      router.push(`/writing/submissions/${result.id}/result`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit essay";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  }, [elapsed, essay, isSubmitting, router, storageKey, task.id]);

  const timeUp = secondsRemaining === 0;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="ghost" className="rounded-xl">
            <Link href={`/writing/tasks?task_type=${task.task_type}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to tasks
            </Link>
          </Button>
          <Badge tone="outline" className="border-border/60 bg-muted/40 text-[10px] uppercase tracking-[0.18em]">
            {task.task_type === "task_1" ? "Task 1" : "Task 2"}
          </Badge>
          {task.difficulty ? (
            <Badge tone="outline" className="text-[10px] uppercase tracking-[0.18em]">
              {task.difficulty}
            </Badge>
          ) : null}
          {task.source ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {task.source}
            </span>
          ) : null}
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{task.title}</h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* LEFT: Prompt + image */}
        <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {task.image_url ? (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={task.image_url} alt={task.title} className="max-h-[420px] w-full rounded-xl object-contain" />
              </div>
            ) : task.task_type === "task_1" ? (
              <div className="flex h-32 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground">
                <ImageIcon className="h-7 w-7 opacity-50" />
              </div>
            ) : null}

            <div
              className="prose prose-sm max-w-none text-sm leading-7 text-foreground prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-foreground dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: task.prompt_html }}
            />

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Minimum {task.word_minimum} words
              </span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" /> Suggested {Math.round(task.time_limit_seconds / 60)} min
              </span>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Editor */}
        <div className="flex flex-col gap-3">
          <Card className="sticky top-24 rounded-3xl border-border/60 bg-card/80 shadow-sm backdrop-blur-md">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold", wordBgTone, wordTone)}>
                <span>{wordCount}</span>
                <span className="opacity-70">/ {task.word_minimum} words</span>
              </div>
              <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-bold text-foreground tabular-nums">
                <Clock3 className="h-3.5 w-3.5" />
                <span>{formatTime(secondsRemaining)}</span>
                {isPaused ? (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">paused</span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {timeUp ? (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Time&apos;s up — you can still submit when you&apos;re ready.</span>
            </div>
          ) : null}

          <Card className="flex flex-1 flex-col rounded-3xl border-border/60 bg-card/70 shadow-sm">
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <Textarea
                value={essay}
                onChange={(event) => setEssay(event.target.value)}
                placeholder="Start writing your essay here…"
                className="min-h-[420px] flex-1 resize-y rounded-2xl border-border/60 bg-background/60 px-4 py-3 font-mono text-sm leading-7"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Drafts autosave every 5 seconds.</span>
                <span>{wordCount >= task.word_minimum ? "You\u2019ve hit the minimum word count." : `Aim for ${task.word_minimum}+ words.`}</span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {!canSubmit ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Write at least {Math.ceil(task.word_minimum * 0.5)} words to submit.
                  </span>
                ) : null}
                <Button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canSubmit || isSubmitting}
                  className="h-11 rounded-xl px-5"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for grading
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => (!isSubmitting ? setConfirmOpen(open) : undefined)}
        title="Submit your essay?"
        description="Once submitted, the AI will grade your writing across all four IELTS criteria. You\u2019ll see a detailed result in about 20-40 seconds."
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold uppercase tracking-widest text-muted-foreground">Words</span>
              <span className="font-semibold text-foreground">{wordCount}</span>
              <span className="font-bold uppercase tracking-widest text-muted-foreground">Time spent</span>
              <span className="font-semibold text-foreground tabular-nums">{formatTime(elapsed)}</span>
            </div>
          </div>
          {submitError ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
              {submitError}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>
              Keep writing
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit now
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
