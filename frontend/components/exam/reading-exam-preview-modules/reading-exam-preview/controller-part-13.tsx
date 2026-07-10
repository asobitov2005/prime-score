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
import { fetchInternalUserApi, useEffect } from "../dependencies";
import { LISTENING_TRANSFER_SECONDS, attemptApiBaseUrl, buildAttemptRequestHeaders, clampFontScale, clampSplitRatio, findSectionIdForQuestion, getDocumentTheme, mergeSectionTimeSpentSeconds } from "../shared";

export function useControllerPart13(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope & Part7Scope & Part8Scope & Part9Scope & Part10Scope & Part11Scope & Part12Scope) {
  const { mode, accessToken, questionPaneRef, examData, initialReviewTarget, initialQuestionId, initialSectionId, setAnswers, setTheme, setSplitRatio, setFontScale, timeLeft, setTimeLeft, isSubmitted, setIsSubmitted, isSubmitting, setIsSubmitting, setIsFullscreen, activeDialog, activeDialogRef, fullscreenDialogStage, setFullscreenDialogStage, fullscreenExitCountdown, setFullscreenExitCountdown, strictListeningPhase, setStrictListeningPhase, strictListeningTransferLeft, setStrictListeningTransferLeft, setStrictListeningIsPlaying, setStrictListeningPlaybackBlocked, setStrictListeningElapsedSeconds, setStrictListeningAudioSectionId, activeQuestionId, setActiveQuestionId, activeSectionId, setActiveSectionId, setShowPassageQuestionNav, setTextHighlights, setSyncState, dialogResetKey, previousDialogResetKeyRef, ignoreNextFullscreenExitRef, updateActiveDialog, hasExamFullscreenSessionRef, strictListeningCompletedAudioRef, pendingAnswerValuesRef, latestAnswersRef, sectionTimeSpentSecondsRef, activeSectionTimerRef, latestProgressRef, allQuestions, previewSections, isExamMode, isReviewMode, isStrictListeningExam, setShowListeningTranscript, setShowTranscriptAnswerLocations, readAttemptBackup, resetWallClockTimer, wallClockTimeSpentSeconds, submitAttempt } = scope;
  useEffect(() => {
          const currentTheme = getDocumentTheme();
          const backup = readAttemptBackup();
          const serverAnswers = examData.initialAnswers ?? {};
          const backupAnswers = backup?.answers ?? {};
          const serverHighlights = examData.initialTextHighlights ?? {};
          const backupHighlights = backup?.textHighlights ?? {};
          const backupAnswerCount = Object.values(backupAnswers).filter((value) => value.trim().length > 0).length;
          const backupHighlightCount = Object.values(backupHighlights).reduce((count, items) => count + items.length, 0);
          const serverTimeSpentSeconds = Math.max(0, examData.initialTimeSpentSeconds ?? 0);
          const backupTimeSpentSeconds = Math.max(0, backup?.timeSpentSec ?? 0);
          const shouldUseBackupContent = Boolean(backup);
          const nextSectionTimeSpentSeconds = mergeSectionTimeSpentSeconds(
            examData.initialSectionTimeSpentSeconds,
            shouldUseBackupContent ? backup?.sectionTimeSpentSec : undefined
          );
          const nextTheme = currentTheme;
          const nextAnswers = shouldUseBackupContent && backupAnswerCount > 0 ? { ...serverAnswers, ...backupAnswers } : serverAnswers;
          const nextTextHighlights = shouldUseBackupContent && backupHighlightCount > 0 ? { ...serverHighlights, ...backupHighlights } : serverHighlights;
          const nextSplitRatio = clampSplitRatio((shouldUseBackupContent ? backup?.uiState?.splitRatio : undefined) ?? examData.initialUiState?.splitRatio ?? 54);
          const nextFontScale = clampFontScale((shouldUseBackupContent ? backup?.uiState?.fontScale : undefined) ?? examData.initialUiState?.fontScale ?? 1);
          const hasInitialReviewTarget = Boolean(initialReviewTarget);
          const nextActiveQuestionId = hasInitialReviewTarget
            ? initialQuestionId
            : (shouldUseBackupContent ? backup?.uiState?.activeQuestionId : undefined) ?? initialQuestionId;
          const nextSectionId = hasInitialReviewTarget
            ? initialSectionId
            : findSectionIdForQuestion(nextActiveQuestionId, examData.questionGroups, examData.paragraphs);
          const nextTimeSpentSeconds = Math.max(serverTimeSpentSeconds, backupTimeSpentSeconds);
  
          document.documentElement.classList.add(nextTheme);
          document.documentElement.classList.remove(nextTheme === "light" ? "dark" : "light");
          setTheme(nextTheme);
          setAnswers(nextAnswers);
          setTextHighlights(nextTextHighlights);
          setSplitRatio(nextSplitRatio);
          setFontScale(nextFontScale);
          setActiveQuestionId(nextActiveQuestionId);
          setActiveSectionId(nextSectionId);
          // Open the active passage's question navigator automatically on first entry,
          // instead of requiring the user to click the passage tab first.
          setShowPassageQuestionNav(true);
          resetWallClockTimer(nextTimeSpentSeconds);
          sectionTimeSpentSecondsRef.current = nextSectionTimeSpentSeconds;
          activeSectionTimerRef.current = nextSectionId ? { sectionId: nextSectionId, startedAtMs: Date.now() } : null;
          setTimeLeft(
            mode === "exam"
              ? Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - nextTimeSpentSeconds)
              : nextTimeSpentSeconds
          );
          setShowListeningTranscript(false);
          setShowTranscriptAnswerLocations(false);
          latestAnswersRef.current = nextAnswers;
          latestProgressRef.current = {
            timeSpentSec: nextTimeSpentSeconds,
            sectionTimeSpentSec: { ...nextSectionTimeSpentSeconds },
            activeQuestionId: nextActiveQuestionId,
            textHighlights: nextTextHighlights,
            uiState: {
              theme: nextTheme,
              splitRatio: nextSplitRatio,
              fontScale: nextFontScale,
              activeQuestionId: nextActiveQuestionId,
            },
          };
          const shouldResetDialogState = previousDialogResetKeyRef.current !== dialogResetKey;
          previousDialogResetKeyRef.current = dialogResetKey;
  
          setIsSubmitted(false);
          setIsSubmitting(false);
          if (shouldResetDialogState) {
            updateActiveDialog(null);
            setFullscreenDialogStage(null);
            setFullscreenExitCountdown(0);
          }
          setStrictListeningPhase(mode === "exam" && examData.testType === "listening" ? "waiting" : "idle");
          setStrictListeningTransferLeft(LISTENING_TRANSFER_SECONDS);
          setStrictListeningIsPlaying(false);
          setStrictListeningPlaybackBlocked(false);
          setStrictListeningElapsedSeconds(nextTimeSpentSeconds);
          setStrictListeningAudioSectionId(nextSectionId);
          strictListeningCompletedAudioRef.current = {};
          setSyncState(examData.attemptId ? "saved" : "idle");
          pendingAnswerValuesRef.current = {};
          ignoreNextFullscreenExitRef.current = false;
          hasExamFullscreenSessionRef.current = false;
        }, [dialogResetKey, examData, initialQuestionId, initialReviewTarget, initialSectionId, isReviewMode, mode, previewSections.length]);

  useEffect(() => {
          if (!isReviewMode || !initialReviewTarget?.questionId) {
            return;
          }
  
          const scrollTimer = window.setTimeout(() => {
            const inlineBlank = questionPaneRef.current?.querySelector<HTMLElement>(
              `[data-question-anchor="${initialReviewTarget.questionId}"]`
            );
            if (inlineBlank) {
              inlineBlank.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
  
            const questionCard = questionPaneRef.current?.querySelector<HTMLElement>(
              `[id="${initialReviewTarget.questionId}"]`
            );
            if (questionCard) {
              questionCard.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
  
            document
              .querySelector<HTMLElement>(`[data-heading-drop-question-id="${initialReviewTarget.questionId}"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 220);
  
          return () => window.clearTimeout(scrollTimer);
        }, [activeSectionId, initialReviewTarget?.questionId, isReviewMode]);

  useEffect(() => {
          const handleFocusOrFullscreenChange = () => {
            const blockingDialog = activeDialogRef.current;
            if (blockingDialog && blockingDialog !== "fullscreen") {
              return;
            }
  
            const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
            setIsFullscreen(isCurrentlyFullscreen);
  
            const isHidden = document.visibilityState === "hidden";
            const isFocused = document.hasFocus ? document.hasFocus() : true;
  
            const isCompliant = isCurrentlyFullscreen && !isHidden && isFocused;
  
            if (isCompliant) {
              hasExamFullscreenSessionRef.current = true;
              return;
            }
  
            if (!isExamMode || isSubmitted || isSubmitting) {
              return;
            }
            if (ignoreNextFullscreenExitRef.current) {
              ignoreNextFullscreenExitRef.current = false;
              return;
            }
            if (!hasExamFullscreenSessionRef.current) {
              return;
            }
  
            if (fullscreenDialogStage === "exited-warning") {
              return;
            }
  
            let eventType = "violation_exit_fullscreen";
            if (isHidden) eventType = "violation_tab_switch";
            else if (!isFocused) eventType = "violation_window_blur";
  
            if (examData.attemptId) {
              void fetchInternalUserApi(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/events`, {
                method: "POST",
                headers: buildAttemptRequestHeaders(accessToken),
                credentials: "same-origin",
                keepalive: true,
                body: JSON.stringify({ event_type: eventType, payload: {} }),
              }).catch(() => undefined);
            }
  
            setFullscreenDialogStage("exited-warning");
            setFullscreenExitCountdown(10);
            updateActiveDialog("fullscreen");
          };
  
          const onVisibilityChange = () => handleFocusOrFullscreenChange();
          const onBlur = () => handleFocusOrFullscreenChange();
          const onFocus = () => handleFocusOrFullscreenChange();
  
          handleFocusOrFullscreenChange();
          document.addEventListener("fullscreenchange", handleFocusOrFullscreenChange);
          document.addEventListener("visibilitychange", onVisibilityChange);
          window.addEventListener("blur", onBlur);
          window.addEventListener("focus", onFocus);
  
          return () => {
            document.removeEventListener("fullscreenchange", handleFocusOrFullscreenChange);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("blur", onBlur);
            window.removeEventListener("focus", onFocus);
          };
        }, [accessToken, examData.attemptId, fullscreenDialogStage, isExamMode, isSubmitted, isSubmitting]);

  useEffect(() => {
          if (isSubmitted) return;
          if (isStrictListeningExam) {
            if (strictListeningPhase !== "transfer") {
              return;
            }
            const timer = window.setInterval(() => {
              setStrictListeningTransferLeft((current) => (current <= 1 ? 0 : current - 1));
              setStrictListeningElapsedSeconds((current) => current + 1);
            }, 1000);
            return () => window.clearInterval(timer);
          }
          if (mode === "exam") {
            const syncExamTimer = () => {
              const timeSpent = wallClockTimeSpentSeconds();
              setTimeLeft(Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - timeSpent));
            };
            syncExamTimer();
            const timer = window.setInterval(() => {
              syncExamTimer();
            }, 1000);
            return () => window.clearInterval(timer);
          }
  
          if (isReviewMode) {
            return;
          }
  
          const timer = window.setInterval(() => {
            setTimeLeft((current) => current + 1);
          }, 1000);
          return () => window.clearInterval(timer);
        }, [examData.timeLimitSeconds, isReviewMode, isStrictListeningExam, isSubmitted, mode, strictListeningPhase]);

  useEffect(() => {
          if (isStrictListeningExam) {
            return;
          }
          if (timeLeft === 0 && mode === "exam" && !isSubmitted) {
            void submitAttempt("time_up");
          }
        }, [isStrictListeningExam, timeLeft, mode, isSubmitted]);

  useEffect(() => {
          if (!isStrictListeningExam || isSubmitted || strictListeningPhase !== "transfer") {
            return;
          }
          if (strictListeningTransferLeft === 0) {
            setStrictListeningPhase("complete");
            void submitAttempt("time_up");
          }
        }, [isStrictListeningExam, isSubmitted, strictListeningPhase, strictListeningTransferLeft]);

  useEffect(() => {
          if (activeDialog !== "fullscreen" || fullscreenDialogStage !== "exited-warning" || isSubmitting) {
            return;
          }
          if (fullscreenExitCountdown <= 0) {
            void submitAttempt("exit_fullscreen");
            return;
          }
  
          const timer = window.setTimeout(() => {
            setFullscreenExitCountdown((current) => current - 1);
          }, 1000);
  
          return () => window.clearTimeout(timer);
        }, [activeDialog, fullscreenDialogStage, fullscreenExitCountdown, isSubmitting]);

  useEffect(() => {
          if (!allQuestions.some((question) => question.id === activeQuestionId)) {
            setActiveQuestionId(allQuestions[0]?.id ?? "");
          }
        }, [activeQuestionId, allQuestions]);

  useEffect(() => {
          if (!previewSections.some((section) => section.id === activeSectionId)) {
            setActiveSectionId(previewSections[0]?.id ?? "section");
          }
        }, [activeSectionId, previewSections]);

  return {  };
}

export type Part13Scope = ReturnType<typeof useControllerPart13>;
