"use client";
import type { BaseScope } from "./base";
import { emitNotificationRefresh, fetchInternalUserApi, trackAttemptSubmit, useEffect, useRouter, useState, useUIStore } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
  const { attemptId, testTitle, mode, scope, passage, meta, initialAnswers } = scope;
  const attemptApiBaseUrl = "/internal-api/attempts";

  const router = useRouter();

  const { activeAttemptTab, setActiveAttemptTab } = useUIStore();

  const visibleTab = activeAttemptTab === "transcript" ? "passage" : activeAttemptTab;

  const [currentQuestionId, setCurrentQuestionId] = useState(passage.questions[0]?.id ?? "");

  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...(initialAnswers ?? {}) }));

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [timeLeft, setTimeLeft] = useState(meta.timeLimitSeconds);

  const initialAnswersKey = JSON.stringify(initialAnswers ?? {});

  useEffect(() => {
      setAnswers({ ...(initialAnswers ?? {}) });
    }, [attemptId, initialAnswers, initialAnswersKey]);

  // Full Screen & Anti-cheat Logic
    useEffect(() => {
      if (mode !== "exam") return;
  
      const enterFullScreen = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.error("Fullscreen request failed", err);
        }
      };
  
      const handleAutoSubmit = (reason: string) => {
        console.warn(`Exam integrity event: ${reason}`);
        let eventType = "violation_unknown";
        if (reason === "tab_switch") eventType = "violation_tab_switch";
        if (reason === "exit_fullscreen") eventType = "violation_exit_fullscreen";
        
        void fetchInternalUserApi(`/internal-api/attempts/${attemptId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ event_type: eventType, payload: {} })
        }).catch(() => undefined);
      };
  
      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          handleAutoSubmit("tab_switch");
        }
      };
  
      const handleFullscreenChange = () => {
        if (!document.fullscreenElement && !isSubmitting) {
          handleAutoSubmit("exit_fullscreen");
        }
      };
  
      // Initialize Exam Environment
      enterFullScreen();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("fullscreenchange", handleFullscreenChange);
  
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
    }, [mode, attemptId, router, isSubmitting]);

  useEffect(() => {
      if (mode !== "exam" || meta.timeLimitSeconds <= 0) return;
  
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
  
      return () => clearInterval(timer);
    }, [mode, meta.timeLimitSeconds]);

  useEffect(() => {
      if (mode === "exam" && meta.timeLimitSeconds > 0 && timeLeft === 0 && !isSubmitting) {
        setIsSubmitting(true);
        fetchInternalUserApi(`${attemptApiBaseUrl}/${attemptId}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: true, reason: "time_up" }),
          })
          .then(async () => {
            trackAttemptSubmit({
              attemptId,
              testTitle,
              testType: "reading",
              mode,
              scope,
              submitReason: "time_up",
            });
            emitNotificationRefresh();
            if (document.fullscreenElement) {
              await document.exitFullscreen().catch(() => undefined);
            }
            await new Promise((resolve) => window.setTimeout(resolve, 1000));
            router.push(`/attempts/${attemptId}/result?reason=time_up`);
          })
          .catch(() => setIsSubmitting(false));
      }
    }, [attemptApiBaseUrl, timeLeft, mode, meta.timeLimitSeconds, isSubmitting, attemptId, router]);

  async function persistAnswer(questionId: string, value: string) {
      setAnswers((current) => ({ ...current, [questionId]: value }));
      setSaveState("saving");
  
      try {
        const response = await fetchInternalUserApi(`/internal-api/attempts/${attemptId}/answer`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            questionId,
            value
          })
        });
        if (!response.ok) {
          throw new Error("Answer save failed.");
        }
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }

  return { attemptApiBaseUrl, router, activeAttemptTab, setActiveAttemptTab, visibleTab, currentQuestionId, setCurrentQuestionId, answers, setAnswers, saveState, setSaveState, isSubmitting, setIsSubmitting, timeLeft, setTimeLeft, initialAnswersKey, persistAnswer };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
