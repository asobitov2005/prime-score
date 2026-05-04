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
  const pendingSeekRef = useRef<{ index: number; startSec: number; autoplay: boolean } | null>(null);

  const filteredQuestionLocations = useMemo(() => {
    const seen = new Set<string>();
    return questionLocations.filter((location) => {
      const startSec = Number(location.startSec ?? 0);
      const endSec = Number(location.endSec ?? 0);
      const hasResolvedTiming = startSec > 0 || endSec > 0;
      if (!hasResolvedTiming) {
        return false;
      }
      const key = `${location.questionLabel}:${startSec}:${endSec}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [questionLocations]);

  const locationsBySegmentId = useMemo(() => {
    const grouped = new Map<string, ListeningTranscriptQuestionLocation[]>();

    segments.forEach((segment) => {
      const locations = filteredQuestionLocations.filter(
        (location) => location.startSec <= segment.endSec && location.endSec >= segment.startSec,
      );
      grouped.set(segment.id, locations);
    });

    return grouped;
  }, [filteredQuestionLocations, segments]);

  const firstAnswerSegmentId = useMemo(() => {
    for (const segment of segments) {
      const locations = locationsBySegmentId.get(segment.id) ?? [];
      if (locations.length > 0) {
        return segment.id;
      }
    }
    return null;
  }, [locationsBySegmentId, segments]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const applySeek = (startSec: number, autoplay: boolean) => {
      const targetTime = Math.max(0, startSec);
      const performSeek = () => {
        if ("fastSeek" in audio && typeof audio.fastSeek === "function") {
          try {
            audio.fastSeek(targetTime);
          } catch {
            audio.currentTime = targetTime;
          }
        } else {
          audio.currentTime = targetTime;
        }
        audio.playbackRate = playbackRate;
        if (autoplay) {
          void audio.play().catch(() => undefined);
        }
      };

      // Some browsers ignore currentTime until metadata is ready.
      if (audio.readyState < HTMLMediaElement.HAVE_METADATA || Number.isNaN(audio.duration)) {
        pendingSeekRef.current = {
          index: activeIndexRef.current,
          startSec: targetTime,
          autoplay,
        };
        audio.load();
        return;
      }

      pendingSeekRef.current = null;
      performSeek();
    };

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
      if (pendingSeekRef.current) {
        const pending = pendingSeekRef.current;
        pendingSeekRef.current = null;
        applySeek(pending.startSec, pending.autoplay);
        return;
      }
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

  useEffect(() => {
    if (!showAnswerLocations || !firstAnswerSegmentId) {
      return;
    }

    const node = segmentRefs.current[firstAnswerSegmentId];
    if (!node) {
      return;
    }

    window.requestAnimationFrame(() => {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [firstAnswerSegmentId, showAnswerLocations]);

  function seekToSegment(index: number) {
    const audio = audioRef.current;
    const segment = segments[index];
    if (!audio || !segment) {
      return;
    }

    activeIndexRef.current = index;
    setActiveIndex(index);
    pendingSeekRef.current = { index, startSec: segment.startSec, autoplay: true };

    const targetTime = Math.max(0, segment.startSec);
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA && !Number.isNaN(audio.duration)) {
      if ("fastSeek" in audio && typeof audio.fastSeek === "function") {
        try {
          audio.fastSeek(targetTime);
        } catch {
          audio.currentTime = targetTime;
        }
      } else {
        audio.currentTime = targetTime;
      }
      audio.playbackRate = playbackRate;
      pendingSeekRef.current = null;
      void audio.play().catch(() => undefined);
      return;
    }

    audio.load();
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

      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
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
                "w-full rounded-xl px-2.5 py-2 text-left transition-all duration-200 ease-out",
                isActive
                  ? "bg-amber-100/80 shadow-[0_12px_24px_-24px_rgba(245,158,11,0.9)] dark:bg-amber-300/14"
                  : hasAnswerLocation
                    ? "bg-emerald-100/70 shadow-[0_12px_24px_-24px_rgba(16,185,129,0.9)] dark:bg-emerald-400/12"
                    : "bg-transparent hover:bg-amber-50/45 dark:hover:bg-amber-300/6",
              )}
            >
              <p
                className={cn(
                  "leading-[1.7] text-foreground transition-colors",
                  hasAnswerLocation ? "font-semibold" : "font-normal",
                )}
              >
                {showAnswerLocations && segmentLocations.length > 0 ? (
                  <span className="mr-2 inline-flex flex-wrap items-center gap-1.5 align-middle">
                    {segmentLocations.map((location) => (
                      <span
                        key={`${segment.id}-${location.questionLabel}`}
                        className="inline-flex items-center rounded-md bg-emerald-500/14 px-1.5 py-0.5 text-[12px] font-bold text-emerald-800 dark:bg-emerald-400/16 dark:text-emerald-200"
                      >
                        {location.questionLabel}
                      </span>
                    ))}
                  </span>
                ) : null}
                <span className={cn(hasAnswerLocation && "font-semibold")}>{segment.text}</span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
