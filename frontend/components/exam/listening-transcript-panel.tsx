"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Repeat2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TRANSCRIPT_SYNC_OFFSET = -0.15;
const PLAYBACK_SPEEDS = [0.75, 1, 1.25] as const;

export interface ListeningTranscriptSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
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

interface ListeningTranscriptPanelProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  segments: ListeningTranscriptSegment[];
  questionLocations?: ListeningTranscriptQuestionLocation[];
  showAnswerLocations?: boolean;
  className?: string;
}

function formatTranscriptTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function findActiveSegmentIndex(segments: ListeningTranscriptSegment[], currentTime: number) {
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

export function ListeningTranscriptPanel({
  audioRef,
  segments,
  questionLocations = [],
  showAnswerLocations = false,
  className,
}: ListeningTranscriptPanelProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const activeIndexRef = useRef(-1);
  const segmentRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const animationFrameRef = useRef<number | null>(null);

  const locationsBySegmentId = useMemo(() => {
    const grouped = new Map<string, ListeningTranscriptQuestionLocation[]>();

    segments.forEach((segment) => {
      const locations = questionLocations.filter(
        (location) => location.startSec <= segment.endSec && location.endSec >= segment.startSec,
      );
      grouped.set(segment.id, locations);
    });

    return grouped;
  }, [questionLocations, segments]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const syncActiveSegment = (rawTime: number) => {
      if (!segments.length) {
        if (activeIndexRef.current !== -1) {
          activeIndexRef.current = -1;
          setActiveIndex(-1);
        }
        return;
      }

      const adjustedTime = Math.max(0, rawTime + TRANSCRIPT_SYNC_OFFSET);
      const currentIndex = activeIndexRef.current;

      if (currentIndex >= 0) {
        const currentSegment = segments[currentIndex];
        if (adjustedTime >= currentSegment.startSec && adjustedTime <= currentSegment.endSec) {
          return;
        }

        if (adjustedTime > currentSegment.endSec) {
          let nextIndex = currentIndex;
          while (nextIndex + 1 < segments.length && adjustedTime > segments[nextIndex].endSec) {
            nextIndex += 1;
          }

          if (
            nextIndex < segments.length &&
            adjustedTime >= segments[nextIndex].startSec &&
            adjustedTime <= segments[nextIndex].endSec
          ) {
            activeIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);
            return;
          }
        }

        if (adjustedTime < currentSegment.startSec) {
          let previousIndex = currentIndex;
          while (previousIndex - 1 >= 0 && adjustedTime < segments[previousIndex].startSec) {
            previousIndex -= 1;
          }

          if (
            previousIndex >= 0 &&
            adjustedTime >= segments[previousIndex].startSec &&
            adjustedTime <= segments[previousIndex].endSec
          ) {
            activeIndexRef.current = previousIndex;
            setActiveIndex(previousIndex);
            return;
          }
        }
      }

      const nextIndex = findActiveSegmentIndex(segments, adjustedTime);
      if (nextIndex !== activeIndexRef.current) {
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }
    };

    const stopAnimationFrame = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const startAnimationFrame = () => {
      stopAnimationFrame();

      const frame = () => {
        syncActiveSegment(audio.currentTime);
        if (!audio.paused && !audio.ended) {
          animationFrameRef.current = window.requestAnimationFrame(frame);
        } else {
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(frame);
    };

    const handleTimeUpdate = () => syncActiveSegment(audio.currentTime);
    const handleSeeked = () => syncActiveSegment(audio.currentTime);
    const handlePlay = () => startAnimationFrame();
    const handlePause = () => stopAnimationFrame();
    const handleEnded = () => {
      stopAnimationFrame();
      activeIndexRef.current = -1;
      setActiveIndex(-1);
    };
    const handleLoadedMetadata = () => {
      audio.playbackRate = playbackRate;
      syncActiveSegment(audio.currentTime);
    };

    handleLoadedMetadata();
    if (!audio.paused) {
      startAnimationFrame();
    }
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeking", handleSeeked);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      stopAnimationFrame();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeking", handleSeeked);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, playbackRate, segments]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }

    const activeSegment = segments[activeIndex];
    const node = activeSegment ? segmentRefs.current[activeSegment.id] : null;
    if (!node) {
      return;
    }

    const container = node.parentElement?.parentElement;
    if (!container) {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const isAbove = nodeRect.top < containerRect.top + 16;
    const isBelow = nodeRect.bottom > containerRect.bottom - 16;

    if (isAbove || isBelow) {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex, segments]);

  function seekToSegment(index: number) {
    const audio = audioRef.current;
    const segment = segments[index];
    if (!audio || !segment) {
      return;
    }

    audio.currentTime = Math.max(0, segment.startSec);
    audio.playbackRate = playbackRate;
    activeIndexRef.current = index;
    setActiveIndex(index);
    void audio.play().catch(() => undefined);
  }

  function repeatActiveSegment() {
    if (activeIndex < 0) {
      return;
    }
    seekToSegment(activeIndex);
  }

  function handlePlaybackRateChange(nextRate: number) {
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }

  return (
    <div className={cn("rounded-[1.4rem] border border-border/75 bg-card/50 p-3", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PLAYBACK_SPEEDS.map((speed) => (
            <Button
              key={speed}
              type="button"
              variant={playbackRate === speed ? "solid" : "outline"}
              size="sm"
              className="h-8 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
              onClick={() => handlePlaybackRateChange(speed)}
            >
              {speed}x
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
          disabled={activeIndex < 0}
          onClick={repeatActiveSegment}
        >
          <Repeat2 className="mr-1.5 h-3.5 w-3.5" />
          Repeat Chunk
        </Button>
      </div>

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {segments.map((segment, index) => {
          const isActive = index === activeIndex;
          const segmentLocations = locationsBySegmentId.get(segment.id) ?? [];
          const hasAnswerLocation = showAnswerLocations && segmentLocations.length > 0;

          return (
            <button
              key={segment.id}
              ref={(node) => {
                segmentRefs.current[segment.id] = node;
              }}
              type="button"
              onClick={() => seekToSegment(index)}
              className={cn(
                "w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200 ease-out",
                isActive
                  ? "border-amber-300 bg-amber-100/85 shadow-[0_14px_30px_-24px_rgba(245,158,11,0.95)] dark:border-amber-300/45 dark:bg-amber-300/18"
                  : hasAnswerLocation
                    ? "border-emerald-400/65 bg-emerald-100/85 shadow-[0_14px_30px_-24px_rgba(16,185,129,0.95)] dark:border-emerald-400/45 dark:bg-emerald-400/16"
                    : "border-transparent bg-background/35 hover:border-amber-200/60 hover:bg-amber-50/60 dark:hover:border-amber-300/20 dark:hover:bg-amber-300/8",
              )}
            >
              <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                <span
                  className={cn(
                    "pt-0.5 text-[11px] font-black uppercase tracking-[0.16em]",
                    isActive
                      ? "text-amber-800 dark:text-amber-100"
                      : hasAnswerLocation
                        ? "text-emerald-800 dark:text-emerald-200"
                        : "text-muted-foreground",
                  )}
                >
                  {formatTranscriptTime(segment.startSec)}
                </span>
                <div className="space-y-2">
                  <p
                    className={cn(
                      "leading-[1.5] text-foreground transition-colors",
                      isActive || hasAnswerLocation ? "font-bold" : "font-medium",
                    )}
                  >
                    {segment.text}
                  </p>
                  {showAnswerLocations && segmentLocations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {segmentLocations.map((location) => (
                        <span
                          key={`${segment.id}-${location.questionLabel}`}
                          className="rounded-full border border-emerald-500/45 bg-emerald-500/18 px-2.5 py-1 text-[11px] font-bold text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/18 dark:text-emerald-100"
                        >
                          {location.questionLabel}: {location.correctAnswer || location.answerText || "match"}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
