"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

function formatAudioTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type ListeningWaveformPlayerProps = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  src: string;
  className?: string;
};

export function ListeningWaveformPlayer({ audioRef, src, className }: ListeningWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.preload = "metadata";
    audio.controls = false;
    audio.src = src;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const handleDurationChange = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    handleLoadedMetadata();
    handleTimeUpdate();

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, src]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      await audio.play().catch(() => undefined);
      return;
    }

    audio.pause();
  }

  function handleScrub(nextSeconds: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(nextSeconds)) {
      return;
    }

    audio.currentTime = nextSeconds;
    setCurrentTime(nextSeconds);
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <audio ref={audioRef} className="hidden" controlsList="nodownload noplaybackrate" onContextMenu={(event) => event.preventDefault()} />
      <button
        type="button"
        onClick={togglePlayback}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_-16px_rgba(245,166,35,0.55)] transition hover:scale-[1.02] hover:opacity-95"
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-11 shrink-0 text-right text-[12px] font-semibold tabular-nums text-muted-foreground">
          {formatAudioTime(currentTime)}
        </span>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-border/80 dark:bg-slate-700/90" />
          <div
            className="pointer-events-none absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_rgba(245,166,35,0.28)]"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || currentTime)}
            onChange={(event) => handleScrub(Number(event.target.value))}
            className="relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[6px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-2px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_6px_16px_rgba(245,166,35,0.4)]"
            aria-label="Seek audio"
          />
        </div>

        <span className="w-11 shrink-0 text-[12px] font-semibold tabular-nums text-muted-foreground">
          {formatAudioTime(duration)}
        </span>
      </div>
    </div>
  );
}
