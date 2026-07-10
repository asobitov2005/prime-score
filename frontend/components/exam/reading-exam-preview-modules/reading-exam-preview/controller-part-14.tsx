"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import type { Part4Scope } from "./controller-part-04";
import type { Part5Scope } from "./controller-part-05";
import type { Part6Scope } from "./controller-part-06";
import type { Part7Scope } from "./controller-part-07";
import type { Part8Scope } from "./controller-part-08";
import type { Part9Scope } from "./controller-part-09";
import type { Part10Scope } from "./controller-part-10";
import type { Part11Scope } from "./controller-part-11";
import type { Part12Scope } from "./controller-part-12";
import type { Part13Scope } from "./controller-part-13";
import { useEffect } from "../dependencies";

export function useControllerPart14(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope & Part7Scope & Part8Scope & Part9Scope & Part10Scope & Part11Scope & Part12Scope & Part13Scope) {
  const { mode, containerRef, examData, answers, theme, splitRatio, setSplitRatio, fontScale, timeLeft, isSubmitted, strictListeningElapsedSeconds, activeQuestionId, isDraggingSplit, setIsDraggingSplit, textHighlights, setSelectionToolbar, allowLeaveRef, updateActiveDialog, saveTimersRef, latestAnswersRef, activeSectionTimerRef, progressSaveTimerRef, isReviewMode, isStrictListeningExam, timedSectionId, writeAttemptBackup, flushActiveSectionTime, resetActiveSectionTimer, refreshLatestProgressSnapshot, persistProgressNow, queueProgressPersist } = scope;
  useEffect(() => {
          if (!examData.attemptId || isSubmitted || isReviewMode || mode === "guest") {
            activeSectionTimerRef.current = null;
            return;
          }
  
          resetActiveSectionTimer(timedSectionId);
          return () => flushActiveSectionTime();
        }, [examData.attemptId, isSubmitted, isReviewMode, mode, timedSectionId]);

  useEffect(() => {
          refreshLatestProgressSnapshot();
        }, [activeQuestionId, examData.timeLimitSeconds, fontScale, isStrictListeningExam, mode, splitRatio, strictListeningElapsedSeconds, textHighlights, theme, timedSectionId, timeLeft]);

  useEffect(() => {
          latestAnswersRef.current = answers;
        }, [answers]);

  useEffect(() => {
          if (!examData.attemptId || isSubmitted || isReviewMode) {
            return;
          }
          writeAttemptBackup();
        }, [answers, examData.attemptId, isSubmitted, isReviewMode, textHighlights, theme, splitRatio, fontScale, activeQuestionId, timedSectionId, timeLeft]);

  useEffect(() => {
          if (!examData.attemptId || isSubmitted || isReviewMode) {
            return;
          }
  
          const handlePageHide = () => {
            writeAttemptBackup();
          };
  
          window.addEventListener("pagehide", handlePageHide);
          return () => window.removeEventListener("pagehide", handlePageHide);
        }, [examData.attemptId, isSubmitted, isReviewMode, answers, textHighlights, theme, splitRatio, fontScale, activeQuestionId, timedSectionId, timeLeft]);

  useEffect(() => {
          if (!examData.attemptId || isSubmitted || isReviewMode) {
            return;
          }
          queueProgressPersist(700);
        }, [activeQuestionId, examData.attemptId, fontScale, isSubmitted, isReviewMode, splitRatio, textHighlights, theme, timedSectionId]);

  useEffect(() => {
          if (!examData.attemptId || isSubmitted || isReviewMode) {
            return;
          }
  
          const timer = window.setInterval(() => {
            void persistProgressNow();
          }, 10000);
  
          return () => {
            window.clearInterval(timer);
          };
        }, [examData.attemptId, isSubmitted, isReviewMode]);

  useEffect(() => {
          return () => {
            if (progressSaveTimerRef.current) {
              window.clearTimeout(progressSaveTimerRef.current);
            }
            for (const timer of Object.values(saveTimersRef.current)) {
              window.clearTimeout(timer);
            }
          };
        }, []);

  useEffect(() => {
          if (!isDraggingSplit) {
            return;
          }
  
          const handlePointerMove = (event: PointerEvent) => {
            const container = containerRef.current;
            if (!container) {
              return;
            }
  
            const rect = container.getBoundingClientRect();
            const nextRatio = ((event.clientX - rect.left) / rect.width) * 100;
            const clampedRatio = Math.min(58, Math.max(42, nextRatio));
            setSplitRatio(Number(clampedRatio.toFixed(1)));
          };
  
          const stopDragging = () => setIsDraggingSplit(false);
  
          window.addEventListener("pointermove", handlePointerMove);
          window.addEventListener("pointerup", stopDragging);
          document.body.style.cursor = "ew-resize";
          document.body.style.userSelect = "none";
  
          return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", stopDragging);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
          };
        }, [isDraggingSplit]);

  useEffect(() => {
          if (isReviewMode) {
            allowLeaveRef.current = true;
            return;
          }
  
          if (isSubmitted) {
            allowLeaveRef.current = true;
            return;
          }
  
          const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
          };
  
          const handlePopState = () => {
            if (allowLeaveRef.current) return;
            window.history.pushState({ examPreviewGuard: true }, "", window.location.href);
            updateActiveDialog("leave");
          };
  
          const handleKeyDown = (event: KeyboardEvent) => {
            const isRefreshShortcut =
              event.key === "F5" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r");
            const isSearchShortcut =
              (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
  
            if (isSearchShortcut) {
              event.preventDefault();
              return;
            }
  
            if (!isRefreshShortcut) return;
            event.preventDefault();
            updateActiveDialog("leave");
          };
  
          window.history.pushState({ examPreviewGuard: true }, "", window.location.href);
          window.addEventListener("beforeunload", handleBeforeUnload);
          window.addEventListener("popstate", handlePopState);
          window.addEventListener("keydown", handleKeyDown);
  
          return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener("keydown", handleKeyDown);
          };
        }, [isReviewMode, isSubmitted]);

  useEffect(() => {
          const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-selection-toolbar]")) {
              return;
            }
            if (target?.closest("[data-highlight-text]")) {
              return;
            }
            setSelectionToolbar(null);
          };
  
          document.addEventListener("mousedown", handlePointerDown);
          return () => document.removeEventListener("mousedown", handlePointerDown);
        }, []);

  useEffect(() => {
          return () => {
            Object.values(saveTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
          };
        }, []);

  return {  };
}

export type Part14Scope = ReturnType<typeof useControllerPart14>;
