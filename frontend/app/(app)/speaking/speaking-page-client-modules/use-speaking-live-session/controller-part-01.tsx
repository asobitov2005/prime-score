"use client";
import type { BaseScope } from "./base";
import { PART_1_QUESTION_COUNT, SpeakingSessionResult, createApiClient, isSpeakingSessionClosingMessage, useCallback, useMemo, useRef, useState } from "../dependencies";
import { LiveAudioRuntime, LiveOutputRuntime, LiveStatus, PART_TWO_PREP_COMPLETE_NO_ANSWER_MS, buildNoAnswerExaminerPrompt, getNoAnswerDelayMs, isPartTwoPreparationPrompt, stopAudioRuntime, stopOutputRuntime } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { entryMode, aiMode, part, topics, randomTopic, prepComplete } = scope;
  const api = useMemo(() => createApiClient(), []);

  const [status, setStatus] = useState<LiveStatus>("idle");

  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<SpeakingSessionResult | null>(null);

  const [examinerTranscript, setExaminerTranscript] = useState("");

  const [userTranscript, setUserTranscript] = useState("");

  const [inputLevel, setInputLevel] = useState(0);

  const [isRecording, setIsRecording] = useState(false);

  const [isStartingMic, setIsStartingMic] = useState(false);

  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const [isInterviewStarted, setIsInterviewStarted] = useState(false);

  const [micError, setMicError] = useState<string | null>(null);

  const [inputTurnOpen, setInputTurnOpen] = useState(false);

  const [turnCount, setTurnCount] = useState(0);

  const [plannedQuestionCount, setPlannedQuestionCount] = useState(PART_1_QUESTION_COUNT);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);

  const audioRef = useRef<LiveAudioRuntime | null>(null);

  const outputAudioRef = useRef<LiveOutputRuntime | null>(null);

  const stoppedRef = useRef(false);

  const deletingSessionRef = useRef(false);

  const statusRef = useRef<LiveStatus>("idle");

  const hasStartedInterviewRef = useRef(false);

  const isStartingAudioRef = useRef(false);

  const audioStartGenerationRef = useRef(0);

  const isInputTurnOpenRef = useRef(false);

  const noAnswerTimerRef = useRef<number | null>(null);

  const yourTurnTimerRef = useRef<number | null>(null);

  const examinerSpeechWatchRef = useRef<number | null>(null);

  const stopRef = useRef<(() => void) | null>(null);

  const ensureBrowserAudioRef = useRef<(() => void) | null>(null);

  const examinerTranscriptRef = useRef("");

  const liveConfigRef = useRef({ entryMode, aiMode, part, topics, randomTopic });

  liveConfigRef.current = { entryMode, aiMode, part, topics, randomTopic };

  const prepCompleteRef = useRef(prepComplete);

  prepCompleteRef.current = prepComplete;

  const aiModeRef = useRef(aiMode);

  aiModeRef.current = aiMode;

  const canStreamInput = useCallback(() => isInputTurnOpenRef.current, []);

  const setLiveStatus = useCallback((next: LiveStatus) => {
      statusRef.current = next;
      setStatus(next);
    }, []);

  const openInputTurn = useCallback(() => {
      isInputTurnOpenRef.current = true;
      setInputTurnOpen(true);
      setLiveStatus("listening");
      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "begin_audio" }));
      }
    }, [setLiveStatus]);

  const closeInputTurnState = useCallback(() => {
      isInputTurnOpenRef.current = false;
      setInputTurnOpen(false);
    }, []);

  const clearNoAnswerTimer = useCallback(() => {
      if (noAnswerTimerRef.current !== null) {
        window.clearTimeout(noAnswerTimerRef.current);
        noAnswerTimerRef.current = null;
      }
    }, []);

  const clearYourTurnTimer = useCallback(() => {
      if (yourTurnTimerRef.current !== null) {
        window.clearTimeout(yourTurnTimerRef.current);
        yourTurnTimerRef.current = null;
      }
    }, []);

  const clearExaminerSpeechWatch = useCallback(() => {
      if (examinerSpeechWatchRef.current !== null) {
        window.clearTimeout(examinerSpeechWatchRef.current);
        examinerSpeechWatchRef.current = null;
      }
    }, []);

  const interruptUserTurnForExaminer = useCallback(() => {
      if (!isInputTurnOpenRef.current) {
        return;
      }
      const socket = wsRef.current;
      closeInputTurnState();
      if (socket?.readyState === WebSocket.OPEN && hasStartedInterviewRef.current) {
        socket.send(JSON.stringify({ type: "end_audio" }));
      }
    }, [closeInputTurnState]);

  const releaseAudioRuntime = useCallback(() => {
      clearNoAnswerTimer();
      clearYourTurnTimer();
      clearExaminerSpeechWatch();
      audioStartGenerationRef.current += 1;
      stopAudioRuntime(audioRef.current);
      audioRef.current = null;
      stopOutputRuntime(outputAudioRef.current);
      outputAudioRef.current = null;
      isStartingAudioRef.current = false;
      isInputTurnOpenRef.current = false;
      setInputTurnOpen(false);
      setIsRecording(false);
      setIsStartingMic(false);
      setInputLevel(0);
    }, [clearNoAnswerTimer, clearYourTurnTimer, clearExaminerSpeechWatch]);

  const closeInputTurn = useCallback((nudgeText?: string) => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !hasStartedInterviewRef.current || !isInputTurnOpenRef.current) {
        return;
      }
      clearNoAnswerTimer();
      closeInputTurnState();
      setLiveStatus("ai_speaking");
      socket.send(JSON.stringify({ type: "end_audio" }));
      if (nudgeText) {
        socket.send(JSON.stringify({ type: "text", text: nudgeText }));
      }
    }, [clearNoAnswerTimer, closeInputTurnState, setLiveStatus]);

  const scheduleNoAnswerPrompt = useCallback(() => {
      clearNoAnswerTimer();
      const examinerText = examinerTranscriptRef.current;
      const delay = prepCompleteRef.current && isPartTwoPreparationPrompt(examinerText)
        ? PART_TWO_PREP_COMPLETE_NO_ANSWER_MS
        : getNoAnswerDelayMs(examinerText);
      noAnswerTimerRef.current = window.setTimeout(() => {
        if (statusRef.current !== "listening" || !hasStartedInterviewRef.current || !isInputTurnOpenRef.current) {
          return;
        }
        closeInputTurn(buildNoAnswerExaminerPrompt(examinerText));
      }, delay);
    }, [clearNoAnswerTimer, closeInputTurn]);

  const finishAnswer = useCallback(() => {
      closeInputTurn();
    }, [closeInputTurn]);

  const resumeBrowserAudioContexts = useCallback(() => {
      void audioRef.current?.inputContext.resume().catch(() => undefined);
      void outputAudioRef.current?.outputContext.resume().catch(() => undefined);
    }, []);

  const scheduleExaminerSpeechWatch = useCallback(() => {
      clearExaminerSpeechWatch();
  
      const checkPlayback = () => {
        examinerSpeechWatchRef.current = null;
        if (stoppedRef.current || !hasStartedInterviewRef.current) {
          return;
        }
        if (statusRef.current !== "ai_speaking") {
          return;
        }
  
        const runtime = outputAudioRef.current;
        const stillPlaying = Boolean(
          runtime && runtime.nextPlaybackAt > runtime.outputContext.currentTime + 0.12,
        );
        if (stillPlaying && runtime) {
          const delayMs = Math.max(
            120,
            (runtime.nextPlaybackAt - runtime.outputContext.currentTime) * 1000 + 120,
          );
          examinerSpeechWatchRef.current = window.setTimeout(checkPlayback, delayMs);
          return;
        }
  
        const { entryMode, part } = liveConfigRef.current;
        if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, entryMode, part)) {
          stopRef.current?.();
          return;
        }
  
        examinerSpeechWatchRef.current = window.setTimeout(() => {
          examinerSpeechWatchRef.current = null;
          if (stoppedRef.current || !hasStartedInterviewRef.current || isInputTurnOpenRef.current) {
            return;
          }
          if (statusRef.current !== "ai_speaking") {
            return;
          }
          const config = liveConfigRef.current;
          if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, config.entryMode, config.part)) {
            stopRef.current?.();
          }
        }, 4500);
      };
  
      examinerSpeechWatchRef.current = window.setTimeout(checkPlayback, 350);
    }, [clearExaminerSpeechWatch]);

  return { api, status, setStatus, error, setError, result, setResult, examinerTranscript, setExaminerTranscript, userTranscript, setUserTranscript, inputLevel, setInputLevel, isRecording, setIsRecording, isStartingMic, setIsStartingMic, isDeletingSession, setIsDeletingSession, isInterviewStarted, setIsInterviewStarted, micError, setMicError, inputTurnOpen, setInputTurnOpen, turnCount, setTurnCount, plannedQuestionCount, setPlannedQuestionCount, elapsedSeconds, setElapsedSeconds, wsRef, audioRef, outputAudioRef, stoppedRef, deletingSessionRef, statusRef, hasStartedInterviewRef, isStartingAudioRef, audioStartGenerationRef, isInputTurnOpenRef, noAnswerTimerRef, yourTurnTimerRef, examinerSpeechWatchRef, stopRef, ensureBrowserAudioRef, examinerTranscriptRef, liveConfigRef, prepCompleteRef, aiModeRef, canStreamInput, setLiveStatus, openInputTurn, closeInputTurnState, clearNoAnswerTimer, clearYourTurnTimer, clearExaminerSpeechWatch, interruptUserTurnForExaminer, releaseAudioRuntime, closeInputTurn, scheduleNoAnswerPrompt, finishAnswer, resumeBrowserAudioContexts, scheduleExaminerSpeechWatch };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
