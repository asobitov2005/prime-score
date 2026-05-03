"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
  buttonClassName,
  cn
} from "@/components/ui";
import type {
  WritingDifficulty,
  WritingTask,
  WritingTaskCreateInput,
  WritingTaskStatus,
  WritingTaskType
} from "@/lib/writing-api";
import { formatImageSummaryStatus, writingApi } from "@/lib/writing-api";

interface WritingTaskFormProps {
  mode: "create" | "edit";
  task?: WritingTask | null;
}

interface FormState {
  title: string;
  task_type: WritingTaskType;
  prompt_html: string;
  image_url: string | null;
  word_minimum: number;
  time_limit_minutes: number;
  difficulty: WritingDifficulty;
  source: string;
  description: string;
  sample_band: string;
  sample_answer: string;
  status: Exclude<WritingTaskStatus, "archived">;
}

function defaultsForType(t: WritingTaskType): { word_minimum: number; time_limit_minutes: number } {
  return t === "task_1"
    ? { word_minimum: 150, time_limit_minutes: 20 }
    : { word_minimum: 250, time_limit_minutes: 40 };
}

function buildInitialState(task: WritingTask | null | undefined): FormState {
  if (task) {
    return {
      title: task.title,
      task_type: task.task_type,
      prompt_html: task.prompt_html,
      image_url: task.image_url ?? null,
      word_minimum: task.word_minimum,
      time_limit_minutes: Math.max(1, Math.round(task.time_limit_seconds / 60)),
      difficulty: task.difficulty,
      source: task.source ?? "",
      description: task.description ?? "",
      sample_band: task.sample_band != null ? String(task.sample_band) : "",
      sample_answer: task.sample_answer ?? "",
      status: task.status === "archived" ? "draft" : task.status
    };
  }
  const defaults = defaultsForType("task_2");
  return {
    title: "",
    task_type: "task_2",
    prompt_html: "",
    image_url: null,
    word_minimum: defaults.word_minimum,
    time_limit_minutes: defaults.time_limit_minutes,
    difficulty: "medium",
    source: "",
    description: "",
    sample_band: "",
    sample_answer: "",
    status: "draft"
  };
}

export function WritingTaskForm({ mode, task }: WritingTaskFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => buildInitialState(task));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageSummary, setImageSummary] = useState<string | null>(task?.image_summary ?? null);
  const [imageSummaryStatus, setImageSummaryStatus] = useState<string>(
    task?.image_summary_status ?? "not_required"
  );
  const [regenLoading, setRegenLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When the task is loaded after mount (rare), keep server-side summary in sync
  useEffect(() => {
    if (task) {
      setImageSummary(task.image_summary ?? null);
      setImageSummaryStatus(task.image_summary_status ?? "not_required");
    }
  }, [task]);

  const isTask1 = state.task_type === "task_1";

  function patchState(patch: Partial<FormState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function onTypeChange(next: WritingTaskType) {
    if (next === state.task_type) return;
    const defaults = defaultsForType(next);
    setState((s) => ({
      ...s,
      task_type: next,
      word_minimum: defaults.word_minimum,
      time_limit_minutes: defaults.time_limit_minutes,
      // clear image when switching to Task 2
      image_url: next === "task_1" ? s.image_url : null
    }));
    if (next === "task_2") {
      setImageSummary(null);
      setImageSummaryStatus("not_required");
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!state.title.trim()) next.title = "Title is required.";
    if (state.title.length > 255) next.title = "Title must be 255 characters or fewer.";
    if (!state.prompt_html.trim()) next.prompt_html = "Prompt is required.";
    if (state.word_minimum < 50 || state.word_minimum > 1000) {
      next.word_minimum = "Word minimum must be between 50 and 1000.";
    }
    const timeSec = state.time_limit_minutes * 60;
    if (timeSec < 300 || timeSec > 10800) {
      next.time_limit_minutes = "Time limit must be between 5 and 180 minutes.";
    }
    if (state.sample_band) {
      const b = Number(state.sample_band);
      if (Number.isNaN(b) || b < 0 || b > 9) {
        next.sample_band = "Band must be between 0 and 9.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleFileUpload(file: File) {
    setUploadError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError("Please upload a PNG, JPEG, or WEBP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be 10 MB or less.");
      return;
    }
    setUploading(true);
    try {
      const result = await writingApi.uploadImage(file);
      patchState({ image_url: result.url });
      // Switching image will mark summary as pending after save
      setImageSummaryStatus("pending");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  async function regenerateSummary() {
    if (!task) return;
    setRegenLoading(true);
    try {
      await writingApi.regenerateImageSummary(task.id);
      setImageSummaryStatus("pending");
      setSuccessMsg("Image summary regeneration started. It will be ready in 10-20 seconds.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to regenerate summary.";
      setSubmitError(message);
    } finally {
      setRegenLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMsg(null);
    if (!validate()) return;

    const payload: WritingTaskCreateInput = {
      title: state.title.trim(),
      task_type: state.task_type,
      prompt_html: state.prompt_html,
      image_url: isTask1 && state.image_url ? state.image_url : null,
      word_minimum: state.word_minimum,
      time_limit_seconds: state.time_limit_minutes * 60,
      difficulty: state.difficulty,
      source: state.source.trim() || null,
      description: state.description.trim() || null,
      sample_band: state.sample_band ? Number(state.sample_band) : null,
      sample_answer: state.sample_answer.trim() || null,
      status: state.status
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        await writingApi.createTask(payload);
        router.push("/writing");
        router.refresh();
      } else if (task) {
        const updated = await writingApi.updateTask(task.id, payload);
        setSuccessMsg("Saved successfully.");
        setImageSummary(updated.image_summary ?? null);
        setImageSummaryStatus(updated.image_summary_status ?? "not_required");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const previewHtml = useMemo(() => state.prompt_html, [state.prompt_html]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner messages */}
      {submitError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
          <div>
            <p className="font-semibold text-danger">Something went wrong</p>
            <p className="opacity-90">{submitError}</p>
          </div>
        </div>
      ) : null}
      {successMsg ? (
        <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
          <p className="opacity-90">{successMsg}</p>
        </div>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-danger">*</span></Label>
            <Input
              id="title"
              value={state.title}
              onChange={(e) => patchState({ title: e.target.value })}
              maxLength={255}
              placeholder="e.g. Bar chart: world population growth 1950-2050"
            />
            {errors.title ? <p className="text-xs text-danger">{errors.title}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Task Type <span className="text-danger">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              {(["task_1", "task_2"] as WritingTaskType[]).map((t) => {
                const active = state.task_type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTypeChange(t)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    <span className="text-sm font-bold text-foreground">
                      {t === "task_1" ? "Task 1" : "Task 2"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t === "task_1"
                        ? "Visual description (chart, graph, diagram). 150 words, 20 minutes."
                        : "Argumentative essay. 250 words, 40 minutes."}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Prompt</CardTitle>
          <p className="text-xs text-muted-foreground">
            HTML supported. Wrap paragraphs in &lt;p&gt;…&lt;/p&gt;.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prompt_html">Source <span className="text-danger">*</span></Label>
              <Textarea
                id="prompt_html"
                value={state.prompt_html}
                onChange={(e) => patchState({ prompt_html: e.target.value })}
                rows={16}
                className="min-h-[400px] font-mono text-[13px] leading-6"
                placeholder={`<p>The chart below shows ...</p>\n<p>Summarise the information by selecting and reporting the main features.</p>`}
              />
              {errors.prompt_html ? <p className="text-xs text-danger">{errors.prompt_html}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="prose prose-sm dark:prose-invert max-w-none min-h-[400px] rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7"
                dangerouslySetInnerHTML={{ __html: previewHtml || "<p class=\"text-muted-foreground italic\">Preview will appear here...</p>" }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isTask1 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Diagram / Chart Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              After saving, the AI will automatically extract a detailed description of your chart/graph used for grading. This usually takes 10-20 seconds.
            </p>

            {state.image_url ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
                  <img
                    src={state.image_url}
                    alt="Task 1 diagram"
                    className="max-h-[400px] w-full object-contain"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={buttonClassName({ variant: "outline", size: "sm" })}
                  >
                    <Upload className="h-4 w-4" />
                    Replace image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      patchState({ image_url: null });
                      setImageSummary(null);
                      setImageSummaryStatus("not_required");
                    }}
                    className={cn(buttonClassName({ variant: "ghost", size: "sm" }), "text-danger hover:bg-danger/10")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                )}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {uploading ? "Uploading…" : "Drag and drop, or click to upload"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, or WEBP, up to 10 MB</p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />

            {uploadError ? (
              <p className="text-xs text-danger">{uploadError}</p>
            ) : null}

            {mode === "edit" && state.image_url ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">AI Image Summary</span>
                    <Badge tone={
                      imageSummaryStatus === "ready" ? "success" :
                      imageSummaryStatus === "pending" ? "warning" :
                      imageSummaryStatus === "failed" ? "danger" : "neutral"
                    }>
                      {formatImageSummaryStatus(imageSummaryStatus)}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => void regenerateSummary()}
                    disabled={regenLoading}
                    className={buttonClassName({ variant: "outline", size: "sm" })}
                  >
                    {regenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Regenerate
                  </button>
                </div>
                <Textarea
                  readOnly
                  value={imageSummary ?? ""}
                  rows={6}
                  placeholder="The AI extraction will appear here once ready."
                  className="bg-background"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Constraints</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="word_minimum">Word minimum</Label>
            <Input
              id="word_minimum"
              type="number"
              min={50}
              max={1000}
              value={state.word_minimum}
              onChange={(e) => patchState({ word_minimum: Number(e.target.value) })}
            />
            {errors.word_minimum ? <p className="text-xs text-danger">{errors.word_minimum}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="time_limit_minutes">Time limit (minutes)</Label>
            <Input
              id="time_limit_minutes"
              type="number"
              min={5}
              max={180}
              value={state.time_limit_minutes}
              onChange={(e) => patchState({ time_limit_minutes: Number(e.target.value) })}
            />
            {errors.time_limit_minutes ? <p className="text-xs text-danger">{errors.time_limit_minutes}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              id="difficulty"
              value={state.difficulty}
              onChange={(e) => patchState({ difficulty: e.target.value as WritingDifficulty })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={state.source}
                onChange={(e) => patchState({ source: e.target.value })}
                placeholder="e.g. Cambridge IELTS 18 Test 3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample_band">Sample band</Label>
              <Input
                id="sample_band"
                type="number"
                min={0}
                max={9}
                step={0.5}
                value={state.sample_band}
                onChange={(e) => patchState({ sample_band: e.target.value })}
                placeholder="e.g. 7.5"
              />
              {errors.sample_band ? <p className="text-xs text-danger">{errors.sample_band}</p> : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (internal notes)</Label>
            <Textarea
              id="description"
              rows={3}
              value={state.description}
              onChange={(e) => patchState({ description: e.target.value })}
              placeholder="Internal notes for moderators (not shown to students)."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sample_answer">Sample answer</Label>
            <Textarea
              id="sample_answer"
              rows={8}
              value={state.sample_answer}
              onChange={(e) => patchState({ sample_answer: e.target.value })}
              placeholder="Reference answer for moderators."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {(["draft", "published"] as const).map((s) => {
              const active = state.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => patchState({ status: s })}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition-all",
                    active
                      ? s === "published"
                        ? "border-success bg-success/8 ring-1 ring-success/30"
                        : "border-warning bg-warning/8 ring-1 ring-warning/30"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <div className="text-sm font-bold text-foreground">
                    {s === "draft" ? "Draft" : "Published"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s === "draft" ? "Not visible to students." : "Visible to students."}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-md">
        <Link href="/writing" className={buttonClassName({ variant: "ghost", size: "md" })}>
          Cancel
        </Link>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="solid"
            disabled={submitting || uploading}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Create task" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
