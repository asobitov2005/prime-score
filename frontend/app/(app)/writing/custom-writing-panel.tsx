"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, PenLine, Send, Target, Clock3, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitWritingSubmission } from "@/lib/client-writing";
import { cn } from "@/lib/utils";

type WritingTaskType = "task_1" | "task_2";

const TASK_CONFIG: Record<WritingTaskType, { label: string; words: number; minutes: number }> = {
  task_1: { label: "Task 1", words: 150, minutes: 20 },
  task_2: { label: "Task 2", words: 250, minutes: 40 },
};

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function formatSeconds(value: number): string {
  const total = Math.max(0, value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CustomWritingPanel() {
  const router = useRouter();
  const [taskType, setTaskType] = useState<WritingTaskType>("task_2");
  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(Date.now());

  const storageKey = `writing-custom-draft:${taskType}`;

  useEffect(() => {
    startedAtRef.current = Date.now();
    setElapsed(0);
  }, [taskType]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { topic?: string; essay?: string };
        setTopic(parsed.topic ?? "");
        setEssay(parsed.essay ?? "");
        return;
      }
    } catch {}
    setTopic("");
    setEssay("");
  }, [storageKey]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ topic, essay }));
      } catch {}
    }, 1000);
    return () => window.clearInterval(id);
  }, [essay, storageKey, topic]);

  const config = TASK_CONFIG[taskType];
  const wordCount = useMemo(() => countWords(essay), [essay]);
  const canSubmit = topic.trim().length > 0 && wordCount >= Math.ceil(config.words * 0.5);

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitWritingSubmission({
        task_type: taskType,
        topic: topic.trim(),
        essay_text: essay,
        time_spent_seconds: elapsed,
      });
      try {
        window.localStorage.removeItem(storageKey);
      } catch {}
      router.push(`/writing/submissions/${result.id}/result`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit writing.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            Instant check
          </Badge>
          <Badge tone="outline" className="text-[10px] uppercase tracking-[0.18em]">
            No preset prompt needed
          </Badge>
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
          Paste any topic and grade your own essay
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          If you already have a question and essay, drop both here. PrimeScore will score it without waiting for you to create a task first.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/40 p-4">
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Task type</div>
            <div className="grid grid-cols-2 gap-2">
              {(["task_1", "task_2"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTaskType(value)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition-colors",
                    taskType === value
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="font-semibold">{TASK_CONFIG[value].label}</div>
                  <div className="mt-1 text-xs">{TASK_CONFIG[value].words}+ words</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="writing-topic" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Topic / question
            </label>
            <Input
              id="writing-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Paste the essay question or topic here"
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Words
              </div>
              <div className="mt-1 text-lg font-semibold text-foreground">{wordCount}</div>
              <div className="text-xs text-muted-foreground">Aim for {config.words}+</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Timer
              </div>
              <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">{formatSeconds(elapsed)}</div>
              <div className="text-xs text-muted-foreground">Guide: {config.minutes} min</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Submit
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {canSubmit ? "Ready" : `Need ${Math.ceil(config.words * 0.5)}+ words`}
              </div>
              <div className="text-xs text-muted-foreground">Topic must be filled</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/writing/tasks?task_type=${taskType}`}>Browse ready prompts</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-xl">
              <Link href="/writing/history">View history</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PenLine className="h-4 w-4" />
            Essay
          </div>
          <Textarea
            value={essay}
            onChange={(event) => setEssay(event.target.value)}
            placeholder="Paste or write your essay here..."
            className="min-h-[420px] rounded-3xl border-border/60 bg-background/60 px-4 py-4 font-mono text-sm leading-7"
          />
          {submitError ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
              {submitError}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Autosaved locally per task type. No admin-side prompt creation needed.
            </p>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || isSubmitting}
              className="h-11 rounded-xl px-5"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit for grading
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
