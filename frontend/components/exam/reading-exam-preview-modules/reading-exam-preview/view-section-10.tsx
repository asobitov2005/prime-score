"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { ListeningWaveformPlayer, Radio, cn } from "../dependencies";

export function ReadingExamPreviewSection10({ scope }: { scope: ReadingExamPreviewScope }) {
  const { isSinglePaneListeningMode, isStrictListeningExam, strictListeningAudioSection, currentSection, showStrictListeningTransferTimer, startStrictListeningAudio, strictListeningPlaybackBlocked, strictListeningIsPlaying, listeningAudioRef, strictListeningAutoPlayDelayMs, setStrictListeningIsPlaying, setStrictListeningPlaybackBlocked, setStrictListeningPhase, updateStrictListeningTimeSnapshot, handleStrictListeningAudioEnded, isLastMinute, isLastFiveMinutes, strictListeningTimerDisplay, timerDisplay } = scope;
  return (
    <div className="flex items-center justify-center">
                    {isSinglePaneListeningMode && (isStrictListeningExam ? strictListeningAudioSection?.audioUrl : currentSection?.audioUrl) && !showStrictListeningTransferTimer ? (
                      <div className="flex w-full max-w-[48rem] flex-col items-center gap-2">
        	                {isStrictListeningExam ? (
        	                  <button
        	                    type="button"
        	                    onClick={() => void startStrictListeningAudio()}
        	                    className={cn(
        	                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] transition",
        	                      strictListeningPlaybackBlocked
        	                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
        	                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        	                    )}
        	                  >
        	                    <Radio className={cn("h-3.5 w-3.5", strictListeningIsPlaying && "animate-pulse")} />
        	                    {strictListeningPlaybackBlocked ? "Tap to start audio" : strictListeningIsPlaying ? "Audio is playing" : "Audio starting"}
        	                  </button>
        	                ) : null}
                        <ListeningWaveformPlayer
                          audioRef={listeningAudioRef}
                          src={(isStrictListeningExam ? strictListeningAudioSection?.audioUrl : currentSection?.audioUrl) ?? ""}
        		                  className="w-full"
        		                  hiddenUi={isStrictListeningExam}
        	                  locked={isStrictListeningExam}
                          autoPlayDelayMs={strictListeningAutoPlayDelayMs}
        	                  onPlaybackStateChange={(playing) => {
        	                    setStrictListeningIsPlaying(playing);
        	                    if (isStrictListeningExam && playing) {
        	                      setStrictListeningPlaybackBlocked(false);
        	                      setStrictListeningPhase("playing");
        	                    }
        	                  }}
        	                  onPlaybackBlocked={setStrictListeningPlaybackBlocked}
        	                  onTimeSnapshot={(currentTime, duration) => {
        	                    const audioSectionId = isStrictListeningExam ? strictListeningAudioSection?.id : currentSection?.id;
        	                    if (audioSectionId) {
        	                      updateStrictListeningTimeSnapshot(audioSectionId, currentTime, duration);
        	                    }
        	                  }}
        	                  onEnded={() => {
        	                    const audioSectionId = isStrictListeningExam ? strictListeningAudioSection?.id : currentSection?.id;
        	                    const audioDuration = isStrictListeningExam ? strictListeningAudioSection?.audioDurationSeconds : currentSection?.audioDurationSeconds;
        	                    if (audioSectionId) {
        	                      handleStrictListeningAudioEnded(audioSectionId, listeningAudioRef.current?.duration ?? audioDuration ?? 0);
        	                    }
        	                  }}
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "px-2 text-center transition-all",
                          isLastMinute && "animate-[pulse_2.4s_ease-in-out_infinite]"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[15px] font-bold leading-none",
                            isLastFiveMinutes
                              ? "font-mono tracking-[0.18em] text-red-400 dark:text-red-300"
                              : "tracking-[0.04em] text-foreground"
                          )}
                        >
                          {showStrictListeningTransferTimer ? strictListeningTimerDisplay : timerDisplay}
                        </p>
                        {showStrictListeningTransferTimer ? (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                            Transfer time
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
  );
}
