"use client";
import type { useSpeakingLiveSessionScope } from "./controller";

export function finishuseSpeakingLiveSession(scope: useSpeakingLiveSessionScope) {
  const { status, error, micError, examinerTranscript, userTranscript, inputLevel, isRecording, isStartingMic, turnCount, plannedQuestionCount, elapsedSeconds, result, isDeletingSession, isInterviewStarted, inputTurnOpen, beginInterview, startMic, finishAnswer, sendText, stop, discard } = scope;
  return {
    status,
    error,
    micError,
    examinerTranscript,
    userTranscript,
    inputLevel,
    isRecording,
    isStartingMic,
    turnCount,
    plannedQuestionCount,
    elapsedSeconds,
    result,
    isDeletingSession,
    isInterviewStarted,
    inputTurnOpen,
    beginInterview,
    startMic,
    finishAnswer,
    sendText,
    stop,
    discard,
  };
}
