"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { isSpeakingSessionClosingMessage, useCallback, useEffect, useRef } from "../dependencies";
import { MIN_SPEECH_MS_BEFORE_SILENCE_END, ROAST_SPEECH_END_SILENCE_MS, SPEECH_END_SILENCE_MS, startAudioRuntime, startOutputRuntime, stopAudioRuntime } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { sessionId, aiMode, api, setStatus, setError, setResult, setExaminerTranscript, setUserTranscript, setInputLevel, setIsRecording, isStartingMic, setIsStartingMic, isDeletingSession, setIsDeletingSession, setIsInterviewStarted, setMicError, setInputTurnOpen, setTurnCount, setElapsedSeconds, wsRef, audioRef, outputAudioRef, stoppedRef, deletingSessionRef, statusRef, hasStartedInterviewRef, isStartingAudioRef, audioStartGenerationRef, isInputTurnOpenRef, yourTurnTimerRef, stopRef, ensureBrowserAudioRef, examinerTranscriptRef, liveConfigRef, aiModeRef, canStreamInput, setLiveStatus, openInputTurn, closeInputTurnState, clearNoAnswerTimer, clearYourTurnTimer, interruptUserTurnForExaminer, releaseAudioRuntime, closeInputTurn, scheduleNoAnswerPrompt, resumeBrowserAudioContexts, scheduleExaminerSpeechWatch } = scope;
  const scheduleOpenInputTurn = useCallback((turn: number | null) => {
      const { entryMode, part } = liveConfigRef.current;
      if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, entryMode, part)) {
        stopRef.current?.();
        return;
      }
      clearYourTurnTimer();
      clearNoAnswerTimer();
  
      const activateInputTurn = () => {
        yourTurnTimerRef.current = null;
        if (stoppedRef.current || !hasStartedInterviewRef.current) {
          return;
        }
        const { entryMode, part } = liveConfigRef.current;
        if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, entryMode, part)) {
          stopRef.current?.();
          return;
        }
        setTurnCount((current) => (turn !== null ? turn : current + 1));
        openInputTurn();
        ensureBrowserAudioRef.current?.();
        resumeBrowserAudioContexts();
        scheduleNoAnswerPrompt();
      };
  
      const runtime = outputAudioRef.current;
      if (runtime) {
        const delayMs = Math.max(0, (runtime.nextPlaybackAt - runtime.outputContext.currentTime) * 1000 + 120);
        if (delayMs > 120) {
          yourTurnTimerRef.current = window.setTimeout(activateInputTurn, delayMs);
          return;
        }
      }
      activateInputTurn();
    }, [clearNoAnswerTimer, clearYourTurnTimer, openInputTurn, resumeBrowserAudioContexts, scheduleNoAnswerPrompt]);

  const getMicTurnHandlers = useCallback(() => {
      const isRoast = aiModeRef.current === "uzbek_roast";
      return {
        onSpeechStart: clearNoAnswerTimer,
        onSilenceTurnEnd: () => closeInputTurn(),
        silenceEndMs: isRoast ? ROAST_SPEECH_END_SILENCE_MS : SPEECH_END_SILENCE_MS,
        minSpeechMsBeforeSilenceEnd: MIN_SPEECH_MS_BEFORE_SILENCE_END,
      };
    }, [clearNoAnswerTimer, closeInputTurn]);

  const fetchResult = useCallback(async (attempt = 0) => {
      if (!sessionId) {
        return;
      }
      try {
        const payload = await api.getSpeakingSessionResult(sessionId);
        if (payload.status === "live" && attempt < 8) {
          window.setTimeout(() => void fetchResult(attempt + 1), 900);
          return;
        }
        releaseAudioRuntime();
        setResult(payload);
        setStatus(payload.status === "graded" || payload.status === "completed" ? "closed" : statusRef.current);
      } catch (resultError) {
        if (attempt < 8) {
          window.setTimeout(() => void fetchResult(attempt + 1), 900);
          return;
        }
        setError(resultError instanceof Error ? resultError.message : "Could not load Speaking feedback.");
        setStatus("error");
      }
    }, [api, releaseAudioRuntime, sessionId]);

  const stop = useCallback(() => {
      stoppedRef.current = true;
      releaseAudioRuntime();
      hasStartedInterviewRef.current = false;
      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "stop" }));
        setStatus("finalizing");
        window.setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close(1000, "user_finished");
          }
        }, 1400);
      } else {
        socket?.close();
        setStatus("finalizing");
      }
      if (aiMode !== "uzbek_roast") {
        void fetchResult();
      }
    }, [aiMode, fetchResult, releaseAudioRuntime]);

  useEffect(() => {
      stopRef.current = stop;
    }, [stop]);

  const discard = useCallback(async (): Promise<boolean> => {
      if (!sessionId || isDeletingSession) {
        return false;
      }
      deletingSessionRef.current = true;
      stoppedRef.current = true;
      setIsDeletingSession(true);
      releaseAudioRuntime();
      hasStartedInterviewRef.current = false;
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close(1000, "user_discarded");
      }
  
      try {
        await api.deleteSpeakingSession(sessionId);
        setResult(null);
        setExaminerTranscript("");
        setUserTranscript("");
        examinerTranscriptRef.current = "";
        setIsInterviewStarted(false);
        setError(null);
        setMicError(null);
        setStatus("closed");
        return true;
      } catch (deleteError) {
        deletingSessionRef.current = false;
        setError(deleteError instanceof Error ? deleteError.message : "Could not discard Speaking session.");
        setStatus("error");
        return false;
      } finally {
        setIsDeletingSession(false);
      }
    }, [api, isDeletingSession, releaseAudioRuntime, sessionId]);

  const sendText = useCallback((text: string) => {
      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "text", text }));
      }
    }, []);

  const startMicRuntime = useCallback(async () => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || audioRef.current || isStartingMic || isStartingAudioRef.current) {
        return;
      }
      isStartingAudioRef.current = true;
      const startGeneration = audioStartGenerationRef.current;
      setIsStartingMic(true);
      setMicError(null);
      try {
        const runtime = await startAudioRuntime(
          () => wsRef.current,
          setInputLevel,
          canStreamInput,
          getMicTurnHandlers(),
          () => (
            audioStartGenerationRef.current === startGeneration
            && !stoppedRef.current
            && hasStartedInterviewRef.current
          ),
        );
        if (
          audioStartGenerationRef.current !== startGeneration
          || stoppedRef.current
          || !hasStartedInterviewRef.current
          || wsRef.current !== socket
          || socket.readyState !== WebSocket.OPEN
        ) {
          stopAudioRuntime(runtime);
          return;
        }
        audioRef.current = runtime;
        setIsRecording(true);
      } catch (runtimeError) {
        if (stoppedRef.current || !hasStartedInterviewRef.current) {
          return;
        }
        setMicError(runtimeError instanceof Error ? runtimeError.message : "Microphone could not be started.");
        setIsRecording(false);
      } finally {
        isStartingAudioRef.current = false;
        setIsStartingMic(false);
      }
    }, [canStreamInput, getMicTurnHandlers, isStartingMic]);

  const beginInterview = useCallback(async () => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || hasStartedInterviewRef.current || isDeletingSession) {
        return;
      }
      hasStartedInterviewRef.current = true;
      isInputTurnOpenRef.current = false;
      setInputTurnOpen(false);
      try {
        outputAudioRef.current ??= startOutputRuntime();
        void outputAudioRef.current.outputContext.resume().catch(() => undefined);
      } catch (outputError) {
        hasStartedInterviewRef.current = false;
        setError(outputError instanceof Error ? outputError.message : "Audio playback is not available in this browser.");
        return;
      }
      setElapsedSeconds(0);
      setIsInterviewStarted(true);
      setLiveStatus("connecting");
      if (!hasStartedInterviewRef.current || wsRef.current !== socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      const { entryMode, aiMode, part, topics, randomTopic } = liveConfigRef.current;
      socket.send(JSON.stringify({ type: "start", entryMode, mode: aiMode, part, topics, randomTopic }));
    }, [isDeletingSession, setLiveStatus]);

  const startMic = useCallback(async () => {
      if (!hasStartedInterviewRef.current) {
        await beginInterview();
        return;
      }
      await startMicRuntime();
    }, [beginInterview, startMicRuntime]);

  const liveSessionHandlersRef = useRef({
      beginInterview,
      fetchResult,
      releaseAudioRuntime,
      setLiveStatus,
      clearNoAnswerTimer,
      clearYourTurnTimer,
      closeInputTurn,
      closeInputTurnState,
      openInputTurn,
      scheduleOpenInputTurn,
      interruptUserTurnForExaminer,
      scheduleExaminerSpeechWatch,
      scheduleNoAnswerPrompt,
      canStreamInput,
      getMicTurnHandlers,
      resumeBrowserAudioContexts,
    });

  liveSessionHandlersRef.current = {
      beginInterview,
      fetchResult,
      releaseAudioRuntime,
      setLiveStatus,
      clearNoAnswerTimer,
      clearYourTurnTimer,
      closeInputTurn,
      closeInputTurnState,
      openInputTurn,
      scheduleOpenInputTurn,
      interruptUserTurnForExaminer,
      scheduleExaminerSpeechWatch,
      scheduleNoAnswerPrompt,
      canStreamInput,
      getMicTurnHandlers,
      resumeBrowserAudioContexts,
    };

  useEffect(() => {
      const resume = () => {
        liveSessionHandlersRef.current.resumeBrowserAudioContexts();
      };
      window.addEventListener("pointerdown", resume, { capture: true });
      return () => window.removeEventListener("pointerdown", resume, { capture: true });
    }, []);

  return { scheduleOpenInputTurn, getMicTurnHandlers, fetchResult, stop, discard, sendText, startMicRuntime, beginInterview, startMic, liveSessionHandlersRef };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
