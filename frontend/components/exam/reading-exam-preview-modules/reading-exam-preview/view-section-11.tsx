"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { Button, CheckCircle2, Expand, ListeningWaveformPlayer, Minus, Moon, Plus, Radio, SendHorizontal, Shrink, SunMedium, cn } from "../dependencies";
import { ReadingExamPreviewSection8 } from "./view-section-11";

export function ReadingExamPreviewSection7({ scope }: { scope: ReadingExamPreviewScope }) {
  const { isSinglePaneListeningMode, updateActiveDialog, theme, syncState, candidateName, isStrictListeningExam, strictListeningAudioSection, currentSection, showStrictListeningTransferTimer, startStrictListeningAudio, strictListeningPlaybackBlocked, strictListeningIsPlaying, listeningAudioRef, strictListeningAutoPlayDelayMs, setStrictListeningIsPlaying, setStrictListeningPlaybackBlocked, setStrictListeningPhase, updateStrictListeningTimeSnapshot, handleStrictListeningAudioEnded, isLastMinute, isLastFiveMinutes, strictListeningTimerDisplay, timerDisplay, headerControlClass, updateTheme, isFullscreen, toggleFullscreen, setFontScale, fontScale, isReviewMode, handleSubmit, submitDisabled, isSubmitted, isSubmitting } = scope;
  return (
    <header className="z-40 shrink-0 border-b border-border/80 bg-background/95 text-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <ReadingExamPreviewSection8 scope={scope} />
              </header>
  );
}
