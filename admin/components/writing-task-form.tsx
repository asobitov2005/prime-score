"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CircleDot,
  FileQuestion,
  Image as ImageIcon,
  LayoutPanelTop,
  LineChart,
  Loader2,
  Map,
  MessageSquareText,
  PieChart,
  RefreshCcw,
  Route,
  Sparkles,
  SplitSquareHorizontal,
  Table2,
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
  Textarea,
  buttonClassName,
  cn
} from "@/components/ui";
import type {
  WritingDifficulty,
  WritingQuestionSubtype,
  WritingTask,
  WritingTaskCreateInput,
  WritingTaskStatus,
  WritingTaskType
} from "@/lib/writing-api";
import {
  formatImageSummaryStatus,
  QUESTION_SUBTYPES_TASK1,
  QUESTION_SUBTYPES_TASK2,
  writingApi
} from "@/lib/writing-api";

interface WritingTaskFormProps {
  mode: "create" | "edit";
  task?: WritingTask | null;
}

interface FormState {
  title: string;
  task_type: WritingTaskType;
  image_url: string | null;
  word_minimum: number;
  time_limit_minutes: number;
  difficulty: WritingDifficulty;
  source: string;
  description: string;
  sample_band: string;
  sample_answer: string;
  question_subtype: WritingQuestionSubtype | null;
  status: Exclude<WritingTaskStatus, "archived">;
}

const subtypeIcons: Record<WritingQuestionSubtype, typeof BarChart3> = {
  bar_chart: BarChart3,
  line_graph: LineChart,
  pie_chart: PieChart,
  table: Table2,
  process: Route,
  map: Map,
  two_charts: LayoutPanelTop,
  opinion: CircleDot,
  advantages_disadvantages: SplitSquareHorizontal,
  discussion: MessageSquareText,
  problem_solution: FileQuestion,
  two_part: LayoutPanelTop,
  causes_effects: Route,
  direct_question: Sparkles,
};

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
      image_url: task.image_url ?? null,
      word_minimum: task.word_minimum,
      time_limit_minutes: Math.max(1, Math.round(task.time_limit_seconds / 60)),
      difficulty: task.difficulty,
      source: task.source ?? "",
      description: task.description ?? "",
      sample_band: task.sample_band != null ? String(task.sample_band) : "",
      sample_answer: task.sample_answer ?? "",
      question_subtype: task.question_subtype ?? null,
      status: task.status === "archived" ? "draft" : task.status
    };
  }
  const defaults = defaultsForType("task_2");
  return {
    title: "",
    task_type: "task_2",
    image_url: null,
    word_minimum: defaults.word_minimum,
    time_limit_minutes: defaults.time_limit_minutes,
    difficulty: "medium",
    source: "",
    description: "",
    sample_band: "",
    sample_answer: "",
    question_subtype: null,
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
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<string | null>(null);
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

  useEffect(() => {
    return () => {
      if (localImagePreviewUrl) {
        URL.revokeObjectURL(localImagePreviewUrl);
      }
    };
  }, [localImagePreviewUrl]);

  const isTask1 = state.task_type === "task_1";
  const previewImageUrl = localImagePreviewUrl ?? state.image_url;

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
    // Reset subtype when switching task type
    setState((s) => ({ ...s, question_subtype: null }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!state.title.trim()) next.title = "Title is required.";
    if (state.title.length > 255) next.title = "Title must be 255 characters or fewer.";
    if (!state.question_subtype) next.question_subtype = "Question subtype is required.";
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
    const previewUrl = URL.createObjectURL(file);
    setLocalImagePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return previewUrl;
    });
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

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const file = Array.from(e.clipboardData.files).find((item) => item.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    void handleFileUpload(file);
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
    if (!state.question_subtype) return;

    const payload: WritingTaskCreateInput = {
      title: state.title.trim(),
      task_type: state.task_type,
      prompt_html: state.title.trim(),
      image_url: isTask1 && state.image_url ? state.image_url : null,
      word_minimum: state.word_minimum,
      time_limit_seconds: state.time_limit_minutes * 60,
      difficulty: state.difficulty,
      source: state.source.trim() || null,
      question_subtype: state.question_subtype,
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
                        ? "Visual description (chart, graph, map, or process). 150 words, 20 minutes."
                        : "Argumentative essay. 250 words, 40 minutes."}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question_subtype">Question Subtype <span className="text-danger">*</span></Label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(state.task_type === "task_1" ? QUESTION_SUBTYPES_TASK1 : QUESTION_SUBTYPES_TASK2).map((opt) => {
                const active = state.question_subtype === opt.value;
                const Icon = subtypeIcons[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      patchState({ question_subtype: opt.value });
                      setErrors((current) => {
                        const next = { ...current };
                        delete next.question_subtype;
                        return next;
                      });
                    }}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                      active
                        ? "border-primary bg-primary/8 text-foreground shadow-sm ring-1 ring-primary/25"
                        : errors.question_subtype
                          ? "border-danger/60 bg-danger/5 text-foreground hover:border-danger hover:bg-danger/8"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="whitespace-nowrap">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.question_subtype ? (
              <p className="text-xs font-semibold text-danger">{errors.question_subtype}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {state.task_type === "task_1"
                  ? "Type of visual: bar chart, line graph, pie chart, etc."
                  : "Essay type: opinion, discussion, problem & solution, etc."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isTask1 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Visual / Chart Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              After saving, the AI will automatically extract a detailed description of your chart/graph used for grading. This usually takes 10-20 seconds.
            </p>

            {previewImageUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
                  <img
                    src={previewImageUrl}
                    alt="Task 1 visual"
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
                      setLocalImagePreviewUrl((current) => {
                        if (current) URL.revokeObjectURL(current);
                        return null;
                      });
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
                role="button"
                tabIndex={0}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onPaste={onPaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center outline-none transition-colors focus-visible:border-primary focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/15",
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
                    {uploading ? "Uploading…" : "Drag and drop, or paste image here"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Click this area to focus, then paste. PNG, JPEG, or WEBP, up to 10 MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={buttonClassName({ variant: "outline", size: "sm" })}
                >
                  <Upload className="h-4 w-4" />
                  Choose file
                </button>
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
