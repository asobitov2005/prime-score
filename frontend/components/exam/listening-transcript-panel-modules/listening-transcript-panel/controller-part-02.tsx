"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { useEffect } from "../dependencies";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { audioRef, segments, showAnswerLocations, activeIndex, setActiveIndex, playbackRate, setPlaybackRate, activeIndexRef, segmentRefs, pendingSeekRef, firstAnswerSegmentId } = scope;
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

  return { seekToSegment, repeatActiveSegment, handlePlaybackRateChange };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
