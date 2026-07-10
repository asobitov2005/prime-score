"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import { emitNotificationRefresh, fetchInternalUserApi } from "../dependencies";
import { LISTENING_TRANSFER_SECONDS, SubmitReason, attemptApiBaseUrl, buildAttemptRequestHeaders } from "../shared";

export function useControllerPart4(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope) {
  const { mode, router, accessToken, listeningAudioRef, examData, initialTimeSpentSeconds, setAnswers, setTheme, isSubmitted, setIsSubmitted, isSubmitting, setIsSubmitting, setIsCalculatingResults, activeDialog, fullscreenDialogStage, setFullscreenDialogStage, setFullscreenExitCountdown, strictListeningPhase, setStrictListeningPhase, strictListeningTransferLeft, setStrictListeningTransferLeft, setStrictListeningIsPlaying, setStrictListeningPlaybackBlocked, setStrictListeningElapsedSeconds, setStrictListeningAudioSectionId, setActiveQuestionId, setShowGuestLoginModal, setSyncState, allowLeaveRef, updateActiveDialog, strictListeningCompletedAudioRef, saveTimersRef, pendingAnswerValuesRef, latestAnswersRef, progressSaveTimerRef, previewSections, isReviewMode, isStrictListeningExam, unansweredCount, clearAttemptBackup, markSyncSaved, markSyncError, persistProgressNow } = scope;
  function queueProgressPersist(delay = 700) {
          if (!examData.attemptId || isSubmitted || isReviewMode) {
            return;
          }
          setSyncState("saving");
          if (progressSaveTimerRef.current) {
            window.clearTimeout(progressSaveTimerRef.current);
          }
          progressSaveTimerRef.current = window.setTimeout(() => {
            progressSaveTimerRef.current = null;
            void persistProgressNow();
          }, delay);
        }

  async function flushPendingAnswerSaves() {
          if (!examData.attemptId || isReviewMode) {
            return;
          }
  
          const pendingEntries = Object.entries(pendingAnswerValuesRef.current);
          pendingAnswerValuesRef.current = {};
  
          for (const timer of Object.values(saveTimersRef.current)) {
            window.clearTimeout(timer);
          }
          saveTimersRef.current = {};
  
          let hadError = false;
          await Promise.all(
            pendingEntries.map(async ([questionId, value]) => {
              try {
                const response = await fetchInternalUserApi(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/answer`, {
                  method: "PATCH",
                  headers: buildAttemptRequestHeaders(accessToken),
                  credentials: "same-origin",
                  body: JSON.stringify({
                    question_id: questionId,
                    value,
                  }),
                });
                if (!response.ok) {
                  throw new Error("Answer save failed");
                }
              } catch {
                hadError = true;
              }
            })
          );
  
          if (hadError) {
            markSyncError();
            throw new Error("Answer flush failed");
          }
  
          markSyncSaved();
        }

  async function flushPendingProgressSave() {
          if (progressSaveTimerRef.current) {
            window.clearTimeout(progressSaveTimerRef.current);
            progressSaveTimerRef.current = null;
          }
          await persistProgressNow();
        }

  async function waitForNextPaint() {
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
          });
        }

  function updateTheme(nextTheme: "light" | "dark") {
          setTheme(nextTheme);
          localStorage.setItem("prime-theme", nextTheme);
          document.documentElement.classList.add(nextTheme);
          document.documentElement.classList.remove(nextTheme === "light" ? "dark" : "light");
        }

  function handleSubmit() {
          if (isSubmitted || isReviewMode) return;
          if (unansweredCount === 0) {
            void submitAttempt("user_confirmed");
            return;
          }
          updateActiveDialog("submit");
        }

  function dismissActiveDialogFromBackdrop() {
          if (activeDialog === "fullscreen") {
            if (fullscreenDialogStage === "confirm-exit") {
              updateActiveDialog(null);
              setFullscreenDialogStage(null);
              return;
            }
            void recoverFullscreen();
            return;
          }
  
          updateActiveDialog(null);
        }

  function persistAnswer(questionId: string, value: string) {
          if (isReviewMode) {
            return;
          }
  
          if (mode === "guest") {
            setActiveQuestionId(questionId);
            setShowGuestLoginModal(true);
            return;
          }
  
          setAnswers((current) => {
            const next = { ...current, [questionId]: value };
            latestAnswersRef.current = next;
            return next;
          });
  
          if (!examData.attemptId) {
            return;
          }
  
          pendingAnswerValuesRef.current[questionId] = value;
          setSyncState("saving");
  
          if (saveTimersRef.current[questionId]) {
            window.clearTimeout(saveTimersRef.current[questionId]);
          }
  
          saveTimersRef.current[questionId] = window.setTimeout(async () => {
            try {
              const response = await fetchInternalUserApi(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/answer`, {
                method: "PATCH",
                headers: buildAttemptRequestHeaders(accessToken),
                credentials: "same-origin",
                body: JSON.stringify({
                  question_id: questionId,
                  value,
                }),
              });
              if (!response.ok) {
                throw new Error("Answer save failed");
              }
              delete pendingAnswerValuesRef.current[questionId];
              delete saveTimersRef.current[questionId];
              markSyncSaved();
            } catch {
              markSyncError();
            }
          }, 220);
        }

  async function submitAttempt(reason: SubmitReason) {
          if (isSubmitting) return;
          updateActiveDialog(null);
          setFullscreenDialogStage(null);
          setFullscreenExitCountdown(0);
          setIsSubmitting(true);
          setIsSubmitted(true);
  
          if (!examData.attemptId) {
            setIsSubmitting(false);
            return;
          }
  
          setIsCalculatingResults(true);
          await waitForNextPaint();
  
          try {
            await flushPendingAnswerSaves();
            await flushPendingProgressSave();
            const response = await fetchInternalUserApi(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/submit`, {
              method: "POST",
              headers: buildAttemptRequestHeaders(accessToken),
              credentials: "same-origin",
              body: JSON.stringify({ confirm: true, reason }),
            });
            if (!response.ok) {
              throw new Error("Submit failed");
            }
            emitNotificationRefresh();
            clearAttemptBackup();
            allowLeaveRef.current = true;
            if (document.fullscreenElement) {
              await document.exitFullscreen().catch(() => undefined);
            }
            await new Promise((resolve) => window.setTimeout(resolve, 1000));
            router.replace(`/attempts/${examData.attemptId}/result`);
          } catch {
            setIsCalculatingResults(false);
            setIsSubmitted(false);
            setIsSubmitting(false);
          }
        }

  function updateStrictListeningTimeSnapshot(sectionId: string, currentTime: number, duration: number) {
          if (!isStrictListeningExam) {
            return;
          }
          const completedSeconds = Object.entries(strictListeningCompletedAudioRef.current).reduce((sum, [completedSectionId, seconds]) => {
            if (completedSectionId === sectionId) {
              return sum;
            }
            return sum + seconds;
          }, 0);
          const currentSeconds = Math.max(0, Math.min(
            Number.isFinite(currentTime) ? currentTime : 0,
            Number.isFinite(duration) && duration > 0 ? duration : currentTime
          ));
          const transferSeconds = strictListeningPhase === "transfer"
            ? LISTENING_TRANSFER_SECONDS - strictListeningTransferLeft
            : 0;
          setStrictListeningElapsedSeconds(Math.floor(initialTimeSpentSeconds + completedSeconds + currentSeconds + transferSeconds));
        }

  function handleStrictListeningAudioEnded(sectionId: string, duration: number) {
          if (!isStrictListeningExam) {
            return;
          }
          const audioSection = previewSections.find((section) => section.id === sectionId);
          const fallbackDuration = audioSection?.audioDurationSeconds ?? duration;
          strictListeningCompletedAudioRef.current[sectionId] = Math.max(0, Math.floor(
            Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration ?? 0
          ));
  
          const audioSectionIndex = previewSections.findIndex((section) => section.id === sectionId);
          const nextSection = previewSections[audioSectionIndex + 1];
          if (nextSection?.audioUrl) {
            setStrictListeningAudioSectionId(nextSection.id);
            setStrictListeningIsPlaying(false);
            setStrictListeningPhase("waiting");
            return;
          }
  
          setStrictListeningIsPlaying(false);
          setStrictListeningTransferLeft(LISTENING_TRANSFER_SECONDS);
          setStrictListeningPhase("transfer");
        }

  async function startStrictListeningAudio() {
          const audio = listeningAudioRef.current;
          if (!audio) {
            return;
          }
          try {
            audio.muted = false;
            await audio.play();
            setStrictListeningPlaybackBlocked(false);
          } catch {
            setStrictListeningPlaybackBlocked(true);
          }
        }

  async function confirmSubmit() {
          if (!examData.attemptId) {
            updateActiveDialog(null);
            setIsSubmitted(true);
            return;
          }
          await submitAttempt("user_confirmed");
        }

  async function recoverFullscreen() {
          try {
            await document.documentElement.requestFullscreen();
            updateActiveDialog(null);
            setFullscreenDialogStage(null);
            setFullscreenExitCountdown(0);
          } catch {}
        }

  return { queueProgressPersist, flushPendingAnswerSaves, flushPendingProgressSave, waitForNextPaint, updateTheme, handleSubmit, dismissActiveDialogFromBackdrop, persistAnswer, submitAttempt, updateStrictListeningTimeSnapshot, handleStrictListeningAudioEnded, startStrictListeningAudio, confirmSubmit, recoverFullscreen };
}

export type Part4Scope = ReturnType<typeof useControllerPart4>;
