"use client";
import type { BaseScope } from "./base";
import { ReactWheelEvent, useAuthStore, useMemo, useRef, useRouter, useState } from "../dependencies";
import { DEFAULT_EXAM_DATA, FullscreenDialogStage, LISTENING_TRANSFER_SECONDS, PreviewDialog, PreviewUiState, SelectionToolbarState, StrictListeningPhase, TextHighlight, clampFontScale, clampSplitRatio, findSectionIdForQuestion, normalizeSectionTimeSpentSeconds, resolveInitialReviewTarget } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { mode, data } = scope;
  const router = useRouter();

  const isAttemptPreview = Boolean(data?.attemptId);

  const storedCandidateName = useAuthStore((state) => state.name);

  const accessToken = useAuthStore((state) => state.accessToken);

  const containerRef = useRef<HTMLElement | null>(null);

  const readingPaneRef = useRef<HTMLDivElement | null>(null);

  const questionPaneRef = useRef<HTMLDivElement | null>(null);

  const listeningAudioRef = useRef<HTMLAudioElement | null>(null);

  const textBlockRefs = useRef<Record<string, HTMLElement | null>>({});

  const examData = data ?? DEFAULT_EXAM_DATA;

  const initialTimeSpentSeconds = Math.max(0, examData.initialTimeSpentSeconds ?? 0);

  const initialReviewTarget = useMemo(
          () => resolveInitialReviewTarget(examData.initialReviewTarget, examData.questionGroups, examData.paragraphs),
          [examData.initialReviewTarget, examData.questionGroups, examData.paragraphs]
        );

  const initialQuestionId = initialReviewTarget?.questionId || examData.initialUiState?.activeQuestionId || examData.questionGroups[0]?.questions[0]?.id || "";

  const initialSectionId = initialReviewTarget?.sectionId || findSectionIdForQuestion(initialQuestionId, examData.questionGroups, examData.paragraphs);

  const [answers, setAnswers] = useState<Record<string, string>>(examData.initialAnswers ?? {});

  const [hasMounted, setHasMounted] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [splitRatio, setSplitRatio] = useState(clampSplitRatio(examData.initialUiState?.splitRatio ?? 54));

  const [fontScale, setFontScale] = useState(clampFontScale(examData.initialUiState?.fontScale ?? 1));

  const [timeLeft, setTimeLeft] = useState(
          mode === "exam"
            ? Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - initialTimeSpentSeconds)
            : initialTimeSpentSeconds
        );

  const [isSubmitted, setIsSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCalculatingResults, setIsCalculatingResults] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [activeDialog, setActiveDialog] = useState<PreviewDialog>(null);

  const activeDialogRef = useRef<PreviewDialog>(null);

  const [fullscreenDialogStage, setFullscreenDialogStage] = useState<FullscreenDialogStage>(null);

  const [fullscreenExitCountdown, setFullscreenExitCountdown] = useState(0);

  const [strictListeningPhase, setStrictListeningPhase] = useState<StrictListeningPhase>("idle");

  const [strictListeningTransferLeft, setStrictListeningTransferLeft] = useState(LISTENING_TRANSFER_SECONDS);

  const [strictListeningIsPlaying, setStrictListeningIsPlaying] = useState(false);

  const [strictListeningPlaybackBlocked, setStrictListeningPlaybackBlocked] = useState(false);

  const [strictListeningElapsedSeconds, setStrictListeningElapsedSeconds] = useState(initialTimeSpentSeconds);

  const [strictListeningAudioSectionId, setStrictListeningAudioSectionId] = useState(
          initialSectionId
        );

  const [activeQuestionId, setActiveQuestionId] = useState(initialQuestionId);

  const [activeSectionId, setActiveSectionId] = useState(initialSectionId);

  const [showPassageQuestionNav, setShowPassageQuestionNav] = useState(false);

  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const [draggingHeading, setDraggingHeading] = useState<{ groupId: string; value: string; sourceQuestionId?: string } | null>(null);

  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);

  const [dragOverHeadingBankGroupId, setDragOverHeadingBankGroupId] = useState<string | null>(null);

  const [draggingWordBank, setDraggingWordBank] = useState<{
          groupId: string;
          value: string;
          sourceQuestionId?: string;
          previewLabel?: string;
        } | null>(null);

  const [dragOverWordBankQuestionId, setDragOverWordBankQuestionId] = useState<string | null>(null);

  const [dragOverWordBankGroupId, setDragOverWordBankGroupId] = useState<string | null>(null);

  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);

  const [textHighlights, setTextHighlights] = useState<Record<string, TextHighlight[]>>(examData.initialTextHighlights ?? {});

  const [explanationHighlightQuote, setExplanationHighlightQuote] = useState<string | null>(null);

  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState>(null);

  const [showGuestLoginModal, setShowGuestLoginModal] = useState(false);

  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">(
          examData.attemptId ? "saved" : "idle"
        );

  const dialogResetKey = [
          mode,
          examData.attemptId ?? "",
          examData.testId ?? "",
          examData.testSlug ?? "",
          examData.testType ?? "reading",
          examData.title,
          initialReviewTarget?.sectionId ?? "",
          initialReviewTarget?.questionId ?? "",
          examData.initialReviewTarget?.questionType ?? "",
        ].join("|");

  const previousDialogResetKeyRef = useRef<string | null>(null);

  const allowLeaveRef = useRef(false);

  const ignoreNextFullscreenExitRef = useRef(false);

  function updateActiveDialog(nextDialog: PreviewDialog) {
          activeDialogRef.current = nextDialog;
          setActiveDialog(nextDialog);
        }

  const hasExamFullscreenSessionRef = useRef(false);

  const strictListeningCompletedAudioRef = useRef<Record<string, number>>({});

  const saveTimersRef = useRef<Record<string, number>>({});

  const pendingAnswerValuesRef = useRef<Record<string, string>>({});

  const latestAnswersRef = useRef<Record<string, string>>(examData.initialAnswers ?? {});

  const sectionTimeSpentSecondsRef = useRef<Record<string, number>>(normalizeSectionTimeSpentSeconds(examData.initialSectionTimeSpentSeconds));

  const activeSectionTimerRef = useRef<{ sectionId: string; startedAtMs: number } | null>(
          initialSectionId ? { sectionId: initialSectionId, startedAtMs: Date.now() } : null
        );

  const progressSaveTimerRef = useRef<number | null>(null);

  const timerBaseSpentSecondsRef = useRef(initialTimeSpentSeconds);

  const timerBaseStartedAtMsRef = useRef(Date.now());

  const latestProgressRef = useRef<{
          timeSpentSec: number;
          sectionTimeSpentSec: Record<string, number>;
          activeQuestionId: string;
          textHighlights: Record<string, TextHighlight[]>;
          uiState: PreviewUiState;
        }>({
          timeSpentSec: initialTimeSpentSeconds,
          sectionTimeSpentSec: normalizeSectionTimeSpentSeconds(examData.initialSectionTimeSpentSeconds),
          activeQuestionId: initialQuestionId,
          textHighlights: examData.initialTextHighlights ?? {},
          uiState: {
            theme: examData.initialUiState?.theme === "light" ? "light" : "dark",
            splitRatio: clampSplitRatio(examData.initialUiState?.splitRatio ?? 54),
            fontScale: clampFontScale(examData.initialUiState?.fontScale ?? 1),
            activeQuestionId: initialQuestionId,
          },
        });

  function handlePaneWheel(event: ReactWheelEvent<HTMLDivElement>) {
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
          event.preventDefault();
          event.stopPropagation();
        }

  const headingDragStateRef = useRef<{
          startX: number;
          startY: number;
          groupId: string;
          value: string;
          sourceQuestionId?: string;
          dragging: boolean;
        } | null>(null);

  const allQuestions = useMemo(() => examData.questionGroups.flatMap((group) => group.questions), [examData.questionGroups]);

  return { router, isAttemptPreview, storedCandidateName, accessToken, containerRef, readingPaneRef, questionPaneRef, listeningAudioRef, textBlockRefs, examData, initialTimeSpentSeconds, initialReviewTarget, initialQuestionId, initialSectionId, answers, setAnswers, hasMounted, setHasMounted, theme, setTheme, splitRatio, setSplitRatio, fontScale, setFontScale, timeLeft, setTimeLeft, isSubmitted, setIsSubmitted, isSubmitting, setIsSubmitting, isCalculatingResults, setIsCalculatingResults, isFullscreen, setIsFullscreen, activeDialog, setActiveDialog, activeDialogRef, fullscreenDialogStage, setFullscreenDialogStage, fullscreenExitCountdown, setFullscreenExitCountdown, strictListeningPhase, setStrictListeningPhase, strictListeningTransferLeft, setStrictListeningTransferLeft, strictListeningIsPlaying, setStrictListeningIsPlaying, strictListeningPlaybackBlocked, setStrictListeningPlaybackBlocked, strictListeningElapsedSeconds, setStrictListeningElapsedSeconds, strictListeningAudioSectionId, setStrictListeningAudioSectionId, activeQuestionId, setActiveQuestionId, activeSectionId, setActiveSectionId, showPassageQuestionNav, setShowPassageQuestionNav, isDraggingSplit, setIsDraggingSplit, draggingHeading, setDraggingHeading, dragOverQuestionId, setDragOverQuestionId, dragOverHeadingBankGroupId, setDragOverHeadingBankGroupId, draggingWordBank, setDraggingWordBank, dragOverWordBankQuestionId, setDragOverWordBankQuestionId, dragOverWordBankGroupId, setDragOverWordBankGroupId, dragPreviewPosition, setDragPreviewPosition, textHighlights, setTextHighlights, explanationHighlightQuote, setExplanationHighlightQuote, selectionToolbar, setSelectionToolbar, showGuestLoginModal, setShowGuestLoginModal, syncState, setSyncState, dialogResetKey, previousDialogResetKeyRef, allowLeaveRef, ignoreNextFullscreenExitRef, updateActiveDialog, hasExamFullscreenSessionRef, strictListeningCompletedAudioRef, saveTimersRef, pendingAnswerValuesRef, latestAnswersRef, sectionTimeSpentSecondsRef, activeSectionTimerRef, progressSaveTimerRef, timerBaseSpentSecondsRef, timerBaseStartedAtMsRef, latestProgressRef, handlePaneWheel, headingDragStateRef, allQuestions };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
