"use client";
import type { BaseScope } from "./base";
import { useEffect, useMemo, useRef, useState } from "../dependencies";
import { ListeningTranscriptQuestionLocation, TRANSCRIPT_SYNC_OFFSET, findActiveSegmentIndex } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { audioRef, segments, questionLocations } = scope;
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

  return { activeIndex, setActiveIndex, playbackRate, setPlaybackRate, activeIndexRef, segmentRefs, animationFrameRef, pendingSeekRef, filteredQuestionLocations, locationsBySegmentId, firstAnswerSegmentId };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
