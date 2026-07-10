"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import { PART_1_QUESTION_COUNT, getFrontendClientWebSocketApiBaseUrl, useAuthStore, useEffect } from "../dependencies";
import { getLiveMessageString, mergeTranscript, parseLiveMessage, playPcmAudio, startAudioRuntime, startOutputRuntime, stopAudioRuntime } from "../shared";

export function useControllerPart3(scope: BaseScope & Part1Scope & Part2Scope) {
  const { sessionId, status, setError, setResult, setExaminerTranscript, setUserTranscript, setInputLevel, setIsRecording, setIsStartingMic, setIsInterviewStarted, setMicError, setInputTurnOpen, setTurnCount, setPlannedQuestionCount, setElapsedSeconds, wsRef, audioRef, outputAudioRef, stoppedRef, deletingSessionRef, statusRef, hasStartedInterviewRef, isStartingAudioRef, audioStartGenerationRef, isInputTurnOpenRef, ensureBrowserAudioRef, examinerTranscriptRef, aiModeRef, setLiveStatus, clearNoAnswerTimer, liveSessionHandlersRef } = scope;
  useEffect(() => {
      if (!sessionId) {
        return;
      }
  
      const accessToken = useAuthStore.getState().accessToken;
      if (!accessToken) {
        setLiveStatus("error");
        setError("Authentication is required to start Speaking AI.");
        return;
      }
  
      let cancelled = false;
      stoppedRef.current = false;
      deletingSessionRef.current = false;
      hasStartedInterviewRef.current = false;
      isStartingAudioRef.current = false;
      audioStartGenerationRef.current += 1;
      isInputTurnOpenRef.current = false;
      setInputTurnOpen(false);
      clearNoAnswerTimer();
      setInputTurnOpen(false);
      setLiveStatus("connecting");
      setError(null);
      setExaminerTranscript("");
      setUserTranscript("");
      examinerTranscriptRef.current = "";
      setResult(null);
      setInputLevel(0);
      setMicError(null);
      setIsStartingMic(false);
      setIsInterviewStarted(false);
      setTurnCount(0);
      setPlannedQuestionCount(PART_1_QUESTION_COUNT);
      setElapsedSeconds(0);
  
      const previousSocket = wsRef.current;
      if (previousSocket) {
        previousSocket.onopen = null;
        previousSocket.onmessage = null;
        previousSocket.onerror = null;
        previousSocket.onclose = null;
        previousSocket.close();
      }
  
      const websocketUrl = new URL(`${getFrontendClientWebSocketApiBaseUrl()}/speaking/sessions/${sessionId}/live`);
      websocketUrl.searchParams.set("token", accessToken);
      const socket = new WebSocket(websocketUrl.toString());
      wsRef.current = socket;
      const isCurrentSocket = () => !cancelled && wsRef.current === socket;
  
      const elapsedTimer = window.setInterval(() => {
        if (
          isCurrentSocket()
          && hasStartedInterviewRef.current
          && statusRef.current !== "finalizing"
          && statusRef.current !== "closed"
          && statusRef.current !== "error"
        ) {
          setElapsedSeconds((current) => current + 1);
        }
      }, 1000);
  
      const handlers = () => liveSessionHandlersRef.current;
  
      const startBrowserAudio = () => {
        if (!isCurrentSocket() || isStartingAudioRef.current) {
          return;
        }
        if (audioRef.current) {
          return;
        }
        isStartingAudioRef.current = true;
        const startGeneration = audioStartGenerationRef.current;
        setIsStartingMic(true);
        setMicError(null);
        startAudioRuntime(
          () => wsRef.current,
          (level) => {
            if (isCurrentSocket()) {
              setInputLevel(level);
            }
          },
          () => handlers().canStreamInput(),
          handlers().getMicTurnHandlers(),
          () => (
            audioStartGenerationRef.current === startGeneration
            && !stoppedRef.current
            && hasStartedInterviewRef.current
            && isCurrentSocket()
          ),
        )
          .then((runtime) => {
            if (
              audioStartGenerationRef.current !== startGeneration
              || stoppedRef.current
              || !hasStartedInterviewRef.current
              || !isCurrentSocket()
            ) {
              stopAudioRuntime(runtime);
              return;
            }
            audioRef.current = runtime;
            setIsRecording(true);
          })
          .catch((runtimeError: unknown) => {
            if (!isCurrentSocket() || stoppedRef.current || !hasStartedInterviewRef.current) {
              return;
            }
            setMicError(runtimeError instanceof Error ? runtimeError.message : "Microphone could not be started.");
            setIsRecording(false);
          })
          .finally(() => {
            isStartingAudioRef.current = false;
            if (isCurrentSocket()) {
              setIsStartingMic(false);
            }
          });
      };
  
      const ensureBrowserAudio = () => {
        if (!isCurrentSocket()) {
          return;
        }
        if (audioRef.current) {
          void audioRef.current.inputContext.resume().catch(() => undefined);
          return;
        }
        startBrowserAudio();
      };
      ensureBrowserAudioRef.current = ensureBrowserAudio;
  
      socket.onopen = () => {
        if (!isCurrentSocket()) {
          return;
        }
        handlers().setLiveStatus("ready");
        window.setTimeout(() => {
          if (!isCurrentSocket() || hasStartedInterviewRef.current || stoppedRef.current) {
            return;
          }
          void handlers().beginInterview();
        }, 0);
      };
  
      socket.onmessage = (event) => {
        if (!isCurrentSocket()) {
          return;
        }
        const message = parseLiveMessage(event.data);
        if (!message) {
          return;
        }
  
        if (message.type === "ready") {
          const plannedQuestions = typeof message.planned_questions === "number" ? message.planned_questions : null;
          if (plannedQuestions && plannedQuestions > 0) {
            setPlannedQuestionCount(plannedQuestions);
          }
          handlers().setLiveStatus(hasStartedInterviewRef.current ? "ai_speaking" : "ready");
          if (hasStartedInterviewRef.current) {
            ensureBrowserAudio();
          }
          return;
        }
        if (message.type === "session_ending") {
          // Server is wrapping up gracefully (e.g. Gemini session time limit). Finalize
          // like a normal end instead of surfacing it as a dropped connection.
          stoppedRef.current = true;
          hasStartedInterviewRef.current = false;
          handlers().releaseAudioRuntime();
          handlers().setLiveStatus("finalizing");
          if (aiModeRef.current !== "uzbek_roast") {
            void handlers().fetchResult();
          }
          return;
        }
        if (message.type === "error") {
          setError(getLiveMessageString(message, "message") || "Speaking AI returned an error.");
          handlers().setLiveStatus("error");
          return;
        }
        if (message.type === "input_transcript") {
          setUserTranscript((current) => mergeTranscript(current, getLiveMessageString(message, "text")));
          return;
        }
        if (message.type === "transcript") {
          handlers().clearNoAnswerTimer();
          setExaminerTranscript((current) => {
            const next = mergeTranscript(current, getLiveMessageString(message, "text"));
            examinerTranscriptRef.current = next;
            return next;
          });
          handlers().interruptUserTurnForExaminer();
          handlers().setLiveStatus("ai_speaking");
          handlers().scheduleExaminerSpeechWatch();
          return;
        }
        if (message.type === "audio") {
          handlers().clearNoAnswerTimer();
          handlers().interruptUserTurnForExaminer();
          handlers().setLiveStatus("ai_speaking");
          try {
            outputAudioRef.current ??= startOutputRuntime();
            void outputAudioRef.current.outputContext.resume().catch(() => undefined);
          } catch (outputError) {
            setError(outputError instanceof Error ? outputError.message : "Audio playback is not available in this browser.");
            setLiveStatus("error");
            return;
          }
          void playPcmAudio(
            getLiveMessageString(message, "data"),
            getLiveMessageString(message, "mimeType") || "audio/pcm;rate=24000",
            outputAudioRef,
          ).finally(() => {
            if (isCurrentSocket()) {
              handlers().scheduleExaminerSpeechWatch();
            }
          });
          handlers().scheduleExaminerSpeechWatch();
          return;
        }
        if (message.type === "your_turn") {
          const serverTurn = typeof message.turn === "number" ? message.turn : null;
          handlers().scheduleOpenInputTurn(serverTurn);
          return;
        }
        if (message.type === "turn_complete") {
          return;
        }
      };
  
      socket.onerror = () => {
        if (!isCurrentSocket()) {
          return;
        }
        setError("Could not connect to the Speaking AI. Please try again.");
        handlers().setLiveStatus("error");
      };
  
      socket.onclose = (event) => {
        if (deletingSessionRef.current) {
          return;
        }
        if (isCurrentSocket() && !stoppedRef.current) {
          const currentStatus = statusRef.current;
          if (currentStatus === "connecting") {
            setError(event.reason || "Speaking AI connection closed before the session became ready.");
            handlers().setLiveStatus("error");
          } else if (currentStatus !== "error") {
            handlers().setLiveStatus("closed");
          }
        }
        if (isCurrentSocket()) {
          handlers().releaseAudioRuntime();
          if (stoppedRef.current && aiModeRef.current !== "uzbek_roast") {
            void handlers().fetchResult();
          }
        }
      };
  
      return () => {
        cancelled = true;
        ensureBrowserAudioRef.current = null;
        window.clearInterval(elapsedTimer);
        handlers().releaseAudioRuntime();
        if (!deletingSessionRef.current && hasStartedInterviewRef.current && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "stop" }));
        }
        socket.close();
      };
    }, [sessionId]);

  useEffect(() => {
      statusRef.current = status;
    }, [status]);

  return {  };
}

export type Part3Scope = ReturnType<typeof useControllerPart3>;
