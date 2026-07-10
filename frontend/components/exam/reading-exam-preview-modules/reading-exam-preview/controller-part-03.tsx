"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import { CSSProperties, fetchInternalUserApi, useMemo } from "../dependencies";
import { PreviewUiState, TextHighlight, attemptApiBaseUrl, buildAttemptRequestHeaders, formatCountdown, formatMinutesLeft, splitOptionLines, typedOptionView } from "../shared";

export function useControllerPart3(scope: BaseScope & Part1Scope & Part2Scope) {
  const { mode, accessToken, examData, answers, theme, splitRatio, fontScale, timeLeft, isSubmitted, isSubmitting, strictListeningPhase, strictListeningTransferLeft, strictListeningElapsedSeconds, activeQuestionId, textHighlights, setSyncState, strictListeningCompletedAudioRef, latestAnswersRef, sectionTimeSpentSecondsRef, activeSectionTimerRef, timerBaseSpentSecondsRef, timerBaseStartedAtMsRef, latestProgressRef, isExamMode, isReviewMode, isStrictListeningExam, answeredCount, totalQuestions } = scope;
  const headingOptionLookup = useMemo(() => {
          const lookup = new Map<string, { value: string; prefix: string; text: string; label: string }>();
          examData.questionGroups
            .filter((group) => group.type.includes("matching_headings"))
            .forEach((group) => {
              const options = group.secondaryBlock?.trim()
                ? splitOptionLines(group.secondaryBlock)
                : (group.sharedOptions ?? []);
  
              options.forEach((option, index) => {
                const optionView = typedOptionView(option, index, group.type);
                lookup.set(`${group.id}:${optionView.value}`, {
                  value: optionView.value,
                  prefix: optionView.prefix,
                  text: optionView.text,
                  label: optionView.label,
                });
              });
            });
          return lookup;
        }, [examData.questionGroups]);

  const unansweredCount = totalQuestions - answeredCount;

  const isLastFiveMinutes = isExamMode && timeLeft <= 5 * 60;

  const isLastMinute = isExamMode && timeLeft <= 60;

  const effectiveFontScale = fontScale * 0.93;

  const bodyFontSize = 17 * effectiveFontScale;

  const timerDisplay = isExamMode
          ? isLastFiveMinutes
            ? formatCountdown(timeLeft)
            : formatMinutesLeft(timeLeft)
          : formatCountdown(timeLeft);

  const strictListeningTimerDisplay = formatCountdown(strictListeningTransferLeft);

  const strictListeningAutoPlayDelayMs = isStrictListeningExam && strictListeningPhase === "waiting"
          ? Object.keys(strictListeningCompletedAudioRef.current).length === 0
            ? 3000
            : 250
          : null;

  const showStrictListeningTransferTimer = isStrictListeningExam && (strictListeningPhase === "transfer" || strictListeningPhase === "complete");

  const submitDisabled = isSubmitted || isSubmitting || (isStrictListeningExam && (strictListeningPhase === "waiting" || strictListeningPhase === "playing"));

  const inputFocusClass = theme === "light"
          ? "focus-visible:border-[#2f436f] focus-visible:ring-1 focus-visible:ring-[#2f436f]/20"
          : "focus-visible:border-primary/45 focus-visible:ring-1 focus-visible:ring-primary/20";

  const activeInputClass = theme === "light"
          ? "border-[#2f436f]/70 ring-1 ring-[#2f436f]/20"
          : "border-primary/45 ring-1 ring-primary/20";

  const answerNumberBadgeClassName = theme === "light"
          ? "border-[#2f436f]/45 bg-white text-[#2f436f]"
          : "border-primary/35 bg-slate-950/30 text-primary";

  const inlineAnswerFieldClassName =
          "mx-1 inline-flex h-[1.55em] min-w-[7.75rem] max-w-full items-center rounded-md border px-2.5 py-0 text-[0.96em] leading-none align-middle shadow-none";

  const inlineAnswerPlaceholderClassName =
          "placeholder:text-[0.86em] placeholder:font-semibold placeholder:tracking-[0.04em] placeholder:opacity-100";

  const inlineRowControlClassName = "h-[1.55em] px-2.5 text-[0.96em] leading-none";

  const layoutStyle = {
          "--reading-pane": `${splitRatio}%`,
          "--question-pane": `${100 - splitRatio}%`,
        } as CSSProperties;

  const examToneStyle = (theme === "light"
          ? {
              "--foreground": "222 47% 11%",
              "--card-foreground": "222 47% 11%",
              "--popover-foreground": "222 47% 11%",
              "--muted-foreground": "215 16% 47%",
            }
          : {
              "--foreground": "210 33% 99%",
              "--card-foreground": "210 33% 99%",
              "--popover-foreground": "210 33% 99%",
              "--muted-foreground": "210 20% 92%",
            }) as CSSProperties;

  const attemptBackupKey = examData.attemptId ? `prime-attempt-backup:${examData.attemptId}` : null;

  function readAttemptBackup() {
          if (!attemptBackupKey || typeof window === "undefined") {
            return null;
          }
  
          try {
            const raw = window.localStorage.getItem(attemptBackupKey);
            if (!raw) {
              return null;
            }
            const parsed = JSON.parse(raw) as {
              answers?: Record<string, string>;
              textHighlights?: Record<string, TextHighlight[]>;
              timeSpentSec?: number;
              sectionTimeSpentSec?: Record<string, number>;
              uiState?: PreviewUiState;
              updatedAt?: number;
            };
            return parsed;
          } catch {
            return null;
          }
        }

  function writeAttemptBackup() {
          if (!attemptBackupKey || typeof window === "undefined" || isSubmitted || isReviewMode) {
            return;
          }
  
          try {
            refreshLatestProgressSnapshot();
            window.localStorage.setItem(attemptBackupKey, JSON.stringify({
              answers: latestAnswersRef.current,
              textHighlights: latestProgressRef.current.textHighlights,
              timeSpentSec: latestProgressRef.current.timeSpentSec,
              sectionTimeSpentSec: latestProgressRef.current.sectionTimeSpentSec,
              uiState: latestProgressRef.current.uiState,
              updatedAt: Date.now(),
            }));
          } catch {}
        }

  function clearAttemptBackup() {
          if (!attemptBackupKey || typeof window === "undefined") {
            return;
          }
          try {
            window.localStorage.removeItem(attemptBackupKey);
          } catch {}
        }

  function markSyncSaved() {
          setSyncState("saved");
        }

  function markSyncError() {
          setSyncState("error");
        }

  function resetWallClockTimer(timeSpentSeconds: number) {
          timerBaseSpentSecondsRef.current = Math.max(0, Math.floor(timeSpentSeconds));
          timerBaseStartedAtMsRef.current = Date.now();
        }

  function wallClockTimeSpentSeconds() {
          const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timerBaseStartedAtMsRef.current) / 1000));
          const nextTimeSpent = timerBaseSpentSecondsRef.current + elapsedSeconds;
          if (mode === "exam") {
            return Math.min(Math.max(0, nextTimeSpent), examData.timeLimitSeconds ?? 20 * 60);
          }
          return Math.max(0, nextTimeSpent);
        }

  function currentTimeSpentSeconds() {
          if (isStrictListeningExam) {
            return Math.max(0, Math.floor(strictListeningElapsedSeconds));
          }
          if (mode === "exam") {
            return wallClockTimeSpentSeconds();
          }
          return Math.max(0, timeLeft);
        }

  function flushActiveSectionTime(nowMs = Date.now()) {
          const current = activeSectionTimerRef.current;
          if (!current?.sectionId || isReviewMode || mode === "guest") {
            return;
          }
          const elapsedSeconds = Math.max(0, Math.floor((nowMs - current.startedAtMs) / 1000));
          if (elapsedSeconds <= 0) {
            return;
          }
          sectionTimeSpentSecondsRef.current = {
            ...sectionTimeSpentSecondsRef.current,
            [current.sectionId]: (sectionTimeSpentSecondsRef.current[current.sectionId] ?? 0) + elapsedSeconds,
          };
          activeSectionTimerRef.current = {
            sectionId: current.sectionId,
            startedAtMs: current.startedAtMs + elapsedSeconds * 1000,
          };
        }

  function resetActiveSectionTimer(sectionId: string) {
          flushActiveSectionTime();
          activeSectionTimerRef.current = sectionId ? { sectionId, startedAtMs: Date.now() } : null;
        }

  function refreshLatestProgressSnapshot() {
          flushActiveSectionTime();
          latestProgressRef.current = {
            timeSpentSec: currentTimeSpentSeconds(),
            sectionTimeSpentSec: { ...sectionTimeSpentSecondsRef.current },
            activeQuestionId,
            textHighlights,
            uiState: {
              theme,
              splitRatio,
              fontScale,
              activeQuestionId,
            },
          };
        }

  async function persistProgressNow() {
          if (!examData.attemptId || isSubmitted || isReviewMode) {
            return;
          }
  
          refreshLatestProgressSnapshot();
          setSyncState("saving");
          try {
            const response = await fetchInternalUserApi(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/progress`, {
              method: "PATCH",
              headers: buildAttemptRequestHeaders(accessToken),
              credentials: "same-origin",
              body: JSON.stringify({
                time_spent_sec: latestProgressRef.current.timeSpentSec,
                section_time_spent_sec: latestProgressRef.current.sectionTimeSpentSec,
                active_question_id: latestProgressRef.current.activeQuestionId,
                text_highlights: latestProgressRef.current.textHighlights,
                ui_state: {
                  theme: latestProgressRef.current.uiState.theme,
                  split_ratio: latestProgressRef.current.uiState.splitRatio,
                  font_scale: latestProgressRef.current.uiState.fontScale,
                },
              }),
            });
            if (!response.ok) {
              throw new Error("Progress save failed");
            }
            markSyncSaved();
          } catch {
            markSyncError();
          }
        }

  return { headingOptionLookup, unansweredCount, isLastFiveMinutes, isLastMinute, effectiveFontScale, bodyFontSize, timerDisplay, strictListeningTimerDisplay, strictListeningAutoPlayDelayMs, showStrictListeningTransferTimer, submitDisabled, inputFocusClass, activeInputClass, answerNumberBadgeClassName, inlineAnswerFieldClassName, inlineAnswerPlaceholderClassName, inlineRowControlClassName, layoutStyle, examToneStyle, attemptBackupKey, readAttemptBackup, writeAttemptBackup, clearAttemptBackup, markSyncSaved, markSyncError, resetWallClockTimer, wallClockTimeSpentSeconds, currentTimeSpentSeconds, flushActiveSectionTime, resetActiveSectionTimer, refreshLatestProgressSnapshot, persistProgressNow };
}

export type Part3Scope = ReturnType<typeof useControllerPart3>;
