"use client";
import type { BaseScope } from "./base";
import { ReactWheelEvent, WritingLimitStatus, fetchWritingLimits, getSubscriptionPageHref, trackUiInteraction, trackWritingStart, useAuthStore, useCallback, useEffect, useRef, useRouter, useState } from "../dependencies";
import { DraftPayload, TASK_CONFIG } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { task, taskType, draftKey } = scope;
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

  const [limitStatus, setLimitStatus] = useState<WritingLimitStatus | null>(null);

  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [mounted, setMounted] = useState(false);

  const essayRef = useRef<HTMLTextAreaElement>(null);

  const lastSavedRef = useRef<number>(0);

  const latestDraftRef = useRef<DraftPayload | null>(null);

  const draftPersistedRef = useRef(false);

  const startTrackedRef = useRef(false);

  const storedCandidateName = useAuthStore((state) => state.name);

  const hasHydratedAuth = useAuthStore((state) => state.hasHydrated);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const candidateName = hasHydratedAuth ? (storedCandidateName || "Guest Candidate") : "Guest Candidate";

  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);

  useEffect(() => {
      setMounted(true);
    }, []);

  useEffect(() => {
      if (!hasHydratedAuth || !isAuthenticated || startTrackedRef.current) {
        return;
      }
      startTrackedRef.current = true;
      trackWritingStart({
        taskType: resolvedTaskType,
        source: task ? "task_library" : "custom_prompt",
        taskId: task?.id,
        hasImage: Boolean(task?.image_url || draftImageDataUrl || imageFile),
      });
    }, [draftImageDataUrl, hasHydratedAuth, imageFile, isAuthenticated, resolvedTaskType, task]);

  useEffect(() => {
      if (!hasHydratedAuth || !isAuthenticated) return;
      let cancelled = false;
      fetchWritingLimits()
        .then((status) => {
          if (!cancelled) setLimitStatus(status);
        })
        .catch(() => {
          if (!cancelled) setLimitStatus(null);
        });
      return () => {
        cancelled = true;
      };
    }, [hasHydratedAuth, isAuthenticated]);

  useEffect(() => {
      if (limitStatus && !limitStatus.can_submit) {
        setShowPremiumModal(true);
      }
    }, [limitStatus]);

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
          trackUiInteraction({
            action: "fullscreen_enter",
            component: "writing_exam_workspace",
          });
        } else {
          await document.exitFullscreen();
          trackUiInteraction({
            action: "fullscreen_exit",
            component: "writing_exam_workspace",
          });
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

  return { router, resolvedTaskType, config, wordMinimum, timeLimitSeconds, storageKey, isStarted, setIsStarted, topic, setTopic, essay, setEssay, imageFile, setImageFile, imagePreviewUrl, setImagePreviewUrl, draftImageDataUrl, setDraftImageDataUrl, secondsRemaining, setSecondsRemaining, elapsed, setElapsed, isSubmitting, setIsSubmitting, submitError, setSubmitError, syncState, setSyncState, theme, setTheme, isFullscreen, setIsFullscreen, hasAcknowledgedTimeUp, setHasAcknowledgedTimeUp, limitStatus, setLimitStatus, showPremiumModal, setShowPremiumModal, mounted, setMounted, essayRef, lastSavedRef, latestDraftRef, draftPersistedRef, startTrackedRef, storedCandidateName, hasHydratedAuth, isAuthenticated, candidateName, subscriptionHref, updateTheme, toggleFullscreen, handlePaneWheel };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
