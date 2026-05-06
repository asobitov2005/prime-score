"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Clock3, ImageIcon, Loader2, Send, Target, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitWritingSubmission, uploadWritingImage } from "@/lib/client-writing";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { cn } from "@/lib/utils";

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

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
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
}: {
  task: ExamWritingTask | null;
  taskType: WritingTaskType;
}) {
  const router = useRouter();
  const resolvedTaskType = task?.task_type ?? taskType;
  const config = TASK_CONFIG[resolvedTaskType];
  const wordMinimum = task?.word_minimum ?? config.words;
  const timeLimitSeconds = task?.time_limit_seconds ?? config.seconds;
  const storageKey = `writing-exam-draft:${task?.id ?? `custom:${resolvedTaskType}`}`;

  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastSavedRef = useRef<number>(0);

  useEffect(() => {
    setSecondsRemaining(timeLimitSeconds);
    setElapsed(0);
    setImageFile(null);
    setSubmitError(null);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { topic?: string; essay?: string };
        setTopic(task ? "" : parsed.topic ?? "");
        setEssay(parsed.essay ?? "");
        return;
      }
    } catch {}

    setTopic("");
    setEssay("");
  }, [storageKey, task, timeLimitSeconds]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [imageFile]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSavedRef.current > 4500) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify({ topic, essay }));
          lastSavedRef.current = now;
        } catch {}
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [essay, storageKey, topic]);

  const wordCount = useMemo(() => countWords(essay), [essay]);
  const minDraftWords = Math.ceil(wordMinimum * 0.5);
  const hasPrompt = task ? true : topic.trim().length > 0;
  const canSubmit = hasPrompt && wordCount >= minDraftWords;
  const timeUp = secondsRemaining === 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let imageUrl: string | null = null;
      if (!task && resolvedTaskType === "task_1" && imageFile) {
        const upload = await uploadWritingImage(imageFile);
        imageUrl = upload.url;
      }

      const result = await submitWritingSubmission({
        task_id: task?.id,
        task_type: task ? undefined : resolvedTaskType,
        topic: task ? undefined : topic.trim(),
        image_url: task ? undefined : imageUrl,
        essay_text: essay,
        time_spent_seconds: elapsed,
      });

      try {
        window.localStorage.removeItem(storageKey);
      } catch {}

      const href = `/writing/submissions/${result.id}/result`;
      emitNavigationStart(href);
      router.push(href);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit essay.");
      setIsSubmitting(false);
    }
  }, [canSubmit, elapsed, essay, imageFile, isSubmitting, resolvedTaskType, router, storageKey, task, topic]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="flex min-h-16 flex-wrap items-center gap-3 px-3 py-2 sm:px-5">
          <Button asChild variant="ghost" size="sm" className="h-10 rounded-lg">
            <Link href="/writing">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">IELTS Academic Writing</p>
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              {config.label}
              {task ? `: ${task.title}` : " practice workspace"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Metric icon={<Target className="h-3.5 w-3.5" />} label="Words" value={`${wordCount}/${wordMinimum}`} />
            <Metric icon={<Clock3 className="h-3.5 w-3.5" />} label="Time" value={formatTime(secondsRemaining)} />
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || isSubmitting}
              className="h-10 rounded-lg px-4"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(320px,43%)_minmax(0,57%)]">
        <section className="border-b border-border/80 bg-background lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="space-y-6 px-4 py-5 sm:px-6">
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-md border border-border/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Writing {config.label}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{config.instruction}</p>
            </div>

            {task ? (
              <PresetPrompt task={task} />
            ) : (
              <CustomPrompt
                taskType={resolvedTaskType}
                topic={topic}
                onTopicChange={setTopic}
                imageFile={imageFile}
                imagePreviewUrl={imagePreviewUrl}
                onImageChange={setImageFile}
              />
            )}

            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6 text-muted-foreground">
              {resolvedTaskType === "task_1"
                ? "Select the most important features and make clear comparisons where relevant."
                : "Give reasons for your answer and include relevant examples from your own knowledge or experience."}
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] flex-col bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Answer</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {wordCount >= wordMinimum ? "Minimum reached." : `Write at least ${wordMinimum} words for the real target.`}
              </p>
            </div>
            {!canSubmit ? (
              <p className="text-xs font-medium text-muted-foreground">
                Need {minDraftWords}+ words{hasPrompt ? "" : " and a question"} to submit.
              </p>
            ) : null}
          </div>

          {timeUp ? (
            <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 sm:mx-6">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Time is up. You can still submit when you are ready.</span>
            </div>
          ) : null}

          {submitError ? (
            <div className="mx-4 mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300 sm:mx-6">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-1 p-4 sm:p-6">
            <Textarea
              value={essay}
              onChange={(event) => setEssay(event.target.value)}
              placeholder="Start writing your answer here"
              className="min-h-[480px] flex-1 resize-none rounded-lg border-border/70 bg-background px-5 py-4 text-[15px] leading-7 lg:min-h-0"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-xs font-semibold text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PresetPrompt({ task }: { task: ExamWritingTask }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Question</p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{task.title}</h2>
        {task.source ? <p className="text-xs font-medium text-muted-foreground">{task.source}</p> : null}
      </div>

      {task.image_url ? (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={task.image_url} alt={task.title} className="max-h-[440px] w-full rounded-md object-contain" />
        </div>
      ) : task.task_type === "task_1" ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
          <ImageIcon className="h-7 w-7 opacity-60" />
        </div>
      ) : null}

      <div
        className="prose prose-sm max-w-none text-sm leading-7 text-foreground prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-foreground dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: task.prompt_html }}
      />
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
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="exam-writing-topic" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Question
        </label>
        <Textarea
          id="exam-writing-topic"
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder={
            taskType === "task_1"
              ? "Paste the Task 1 question. If the visual is separate, upload it below."
              : "Paste the Task 2 essay question here."
          }
          className="min-h-[160px] rounded-lg border-border/70 bg-background px-4 py-3 text-sm leading-6"
        />
      </div>

      {taskType === "task_1" ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Visual</p>
          <div
            className={cn(
              "rounded-lg border border-dashed border-border/70 bg-muted/20 p-3",
              imagePreviewUrl && "border-solid bg-background",
            )}
          >
            {imagePreviewUrl ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt={imageFile?.name ?? "Task 1 visual"} className="max-h-64 w-full rounded-md object-contain" />
                <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg" onClick={() => onImageChange(null)}>
                  <X className="h-4 w-4" />
                  Remove image
                </Button>
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
      ) : null}
    </div>
  );
}
