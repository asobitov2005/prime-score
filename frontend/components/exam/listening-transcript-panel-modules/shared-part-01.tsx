"use client";

import { ReactNode, RefObject } from "./dependencies";



export const TRANSCRIPT_SYNC_OFFSET = -0.15;

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25] as const;

export interface ListeningTranscriptSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string;
}

export interface ListeningTranscriptQuestionLocation {
  questionId?: string;
  questionLabel: string;
  questionPrompt: string;
  startSec: number;
  endSec: number;
  answerText: string;
  correctAnswer: string;
}

export interface ListeningTranscriptPanelProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  segments: ListeningTranscriptSegment[];
  questionLocations?: ListeningTranscriptQuestionLocation[];
  showAnswerLocations?: boolean;
  className?: string;
}

export function findActiveSegmentIndex(segments: ListeningTranscriptSegment[], currentTime: number) {
  let low = 0;
  let high = segments.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const segment = segments[mid];
    if (currentTime < segment.startSec) {
      high = mid - 1;
      continue;
    }
    if (currentTime > segment.endSec) {
      low = mid + 1;
      continue;
    }
    return mid;
  }

  return -1;
}

export function renderInlineItalicText(text: string, keyPrefix: string): ReactNode {
  const tokens = text.split(/(<\/?i>)/i);
  const parts: ReactNode[] = [];
  let italic = false;
  let plainIndex = 0;

  tokens.forEach((token, index) => {
    if (!token) {
      return;
    }
    if (/^<i>$/i.test(token)) {
      italic = true;
      return;
    }
    if (/^<\/i>$/i.test(token)) {
      italic = false;
      return;
    }

    if (italic) {
      parts.push(
        <em key={`${keyPrefix}-italic-${index}`} className="italic">
          {token}
        </em>
      );
      return;
    }

    parts.push(<span key={`${keyPrefix}-plain-${plainIndex}`}>{token}</span>);
    plainIndex += 1;
  });

  return parts.length > 0 ? parts : text;
}
