"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Loader2, PenLine, Send, Target, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitWritingSubmission, uploadWritingImage } from "@/lib/client-writing";
import { cn } from "@/lib/utils";

type WritingTaskType = "task_1" | "task_2";

const TASK_CONFIG: Record<WritingTaskType, { label: string; words: number; description: string }> = {
  task_1: {
    label: "Task 1",
    words: 150,
    description: "Check a chart, table, map, process, or letter-style response.",
  },
  task_2: {
    label: "Task 2",
    words: 250,
    description: "Check a finished academic essay response.",
  },
};

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function CustomWritingPanel() {
  const router = useRouter();
  const [taskType, setTaskType] = useState<WritingTaskType | null>(null);
  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const storageKey = taskType ? `writing-finished-draft:${taskType}` : null;

  useEffect(() => {
    if (!taskType || !storageKey) return;
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
  }, [storageKey, taskType]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ topic, essay }));
    } catch {}
  }, [essay, storageKey, topic]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [imageFile]);

  const config = taskType ? TASK_CONFIG[taskType] : null;
  const wordCount = useMemo(() => countWords(essay), [essay]);
  const requiredDraftWords = config ? Math.ceil(config.words * 0.5) : 0;
  const canSubmit = Boolean(taskType && topic.trim().length > 0 && wordCount >= requiredDraftWords);

  function selectTaskType(nextTaskType: WritingTaskType) {
    setTaskType(nextTaskType);
    setImageFile(null);
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (!taskType || !config || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let imageUrl: string | null = null;
      if (taskType === "task_1" && imageFile) {
        const upload = await uploadWritingImage(imageFile);
        imageUrl = upload.url;
      }

      const result = await submitWritingSubmission({
        task_type: taskType,
        topic: topic.trim(),
        image_url: imageUrl,
        essay_text: essay,
        time_spent_seconds: 0,
      });

      try {
        if (storageKey) window.localStorage.removeItem(storageKey);
      } catch {}
      router.push(`/writing/submissions/${result.id}/result`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit writing.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline" className="border-border/60 bg-background/80 text-[10px] uppercase tracking-[0.18em]">
            Finished answer check
          </Badge>
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
          Check writing you already finished
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Choose the task type first, then paste the question and your answer for grading.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          {(["task_1", "task_2"] as const).map((value) => {
            const taskConfig = TASK_CONFIG[value];
            const active = taskType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => selectTaskType(value)}
                className={cn(
                  "flex min-h-[116px] w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-foreground/30 bg-background text-foreground"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-foreground">
                  {value === "task_1" ? <ImageIcon className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold">{taskConfig.label}</span>
                  <span className="mt-1 block text-sm leading-5">{taskConfig.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold">
                    <Target className="h-3.5 w-3.5" />
                    {taskConfig.words}+ words
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {taskType && config ? (
          <div className="grid gap-4 border-t border-border/60 pt-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="finished-writing-topic" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Topic / question
                </label>
                <Textarea
                  id="finished-writing-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Paste the exact essay question or task prompt here"
                  className="min-h-[132px] rounded-xl border-border/60 bg-background/70 text-sm leading-6"
                />
              </div>

              {taskType === "task_1" ? (
                <div className="space-y-2">
                  <label htmlFor="finished-writing-image" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Task 1 visual
                  </label>
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/50 p-3">
                    {imagePreviewUrl ? (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreviewUrl} alt="Task 1 visual preview" className="max-h-44 w-full rounded-lg object-contain" />
                        <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg" onClick={() => setImageFile(null)}>
                          <X className="h-4 w-4" />
                          Remove image
                        </Button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 px-3 py-6 text-center text-sm text-muted-foreground">
                        <UploadCloud className="h-6 w-6" />
                        <span className="font-medium text-foreground">Upload chart or diagram</span>
                        <span className="text-xs">PNG, JPG, or WebP under 10 MB</span>
                        <Input
                          id="finished-writing-image"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Words</span>
                  <span className="font-semibold text-foreground">{wordCount}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {wordCount >= config.words ? "IELTS minimum reached." : `Aim for ${config.words}+ words.`}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="finished-writing-essay" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Essay
              </label>
              <Textarea
                id="finished-writing-essay"
                value={essay}
                onChange={(event) => setEssay(event.target.value)}
                placeholder="Paste your finished answer here"
                className="min-h-[360px] resize-y rounded-xl border-border/60 bg-background/70 px-4 py-4 text-sm leading-7"
              />
              {submitError ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                  {submitError}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Draft text is saved locally. No timer is used for finished-answer checks.</p>
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
