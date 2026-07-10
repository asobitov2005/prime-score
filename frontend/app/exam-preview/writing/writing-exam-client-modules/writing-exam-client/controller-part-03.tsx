"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import { ExamPreviewAccessGate, deleteWritingDraftClient, emitNavigationStart, fetchWritingLimits, getStoredDesiredScore, submitWritingSubmission, trackWritingSubmit, uploadWritingImage, useCallback } from "../dependencies";

export function useControllerPart3(scope: BaseScope & Part1Scope & Part2Scope) {
  const { task, router, resolvedTaskType, storageKey, isStarted, topic, essay, imageFile, draftImageDataUrl, elapsed, isSubmitting, setIsSubmitting, setSubmitError, limitStatus, setLimitStatus, setShowPremiumModal, hasHydratedAuth, isAuthenticated, wordCount, canSubmit } = scope;
  const handleSubmit = useCallback(async () => {
      if (!isStarted || !canSubmit || isSubmitting) return;
      if (limitStatus && !limitStatus.can_submit) {
        setShowPremiumModal(true);
        return;
      }
  
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
        trackWritingSubmit({
          taskType: resolvedTaskType,
          source: task ? "task_library" : "custom_prompt",
          submissionId: result.id,
          taskId: task?.id,
          wordCount,
          timeSpentSeconds: elapsed,
          hasImage: Boolean(task?.image_url || imageUrl || draftImageDataUrl || imageFile),
        });
  
        try {
          window.localStorage.removeItem(storageKey);
        } catch {}
        void deleteWritingDraftClient(storageKey).catch(() => {});
  
        const href = `/writing/submissions/${result.id}/result`;
        emitNavigationStart(href);
        router.push(href);
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: number }).status) : null;
        if (statusCode === 402 || statusCode === 429) {
          void fetchWritingLimits().then(setLimitStatus).catch(() => undefined);
          setShowPremiumModal(true);
        }
        setSubmitError(error instanceof Error ? error.message : "Failed to submit essay.");
        setIsSubmitting(false);
      }
    }, [canSubmit, draftImageDataUrl, elapsed, essay, imageFile, isStarted, isSubmitting, limitStatus, resolvedTaskType, router, storageKey, task, topic, wordCount]);

  if (hasHydratedAuth && !isAuthenticated) {
      return <ExamPreviewAccessGate kind="writing" backHref="/writing" />;
    }

  return { handleSubmit };
}

export type Part3Scope = ReturnType<typeof useControllerPart3>;
