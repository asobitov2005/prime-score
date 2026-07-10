"use client";
import type { BaseScope } from "./base";
import { WritingTaskCreateInput, WritingTaskType, useEffect, useRef, useRouter, useState, writingApi } from "../dependencies";
import { FormState, buildInitialState, defaultsForType } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { mode, task } = scope;
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

  return { router, state, setState, errors, setErrors, submitting, setSubmitting, submitError, setSubmitError, successMsg, setSuccessMsg, uploading, setUploading, uploadError, setUploadError, imageSummary, setImageSummary, imageSummaryStatus, setImageSummaryStatus, localImagePreviewUrl, setLocalImagePreviewUrl, regenLoading, setRegenLoading, dragActive, setDragActive, fileInputRef, isTask1, previewImageUrl, patchState, onTypeChange, validate, handleFileUpload, onDrop, onPaste, regenerateSummary, handleSubmit };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
