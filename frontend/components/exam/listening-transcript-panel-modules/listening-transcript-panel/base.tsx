"use client";
import type { ListeningTranscriptPanelProps } from "../shared";

export function useBaseScope(props: ListeningTranscriptPanelProps) {
  const {
    audioRef,
    segments,
    questionLocations = [],
    showAnswerLocations = false,
    className,
  } = props;
    return { audioRef, segments, questionLocations, showAnswerLocations, className };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
