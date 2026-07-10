"use client";
import type { ListeningTranscriptPanelScope } from "./controller";
import { Button, Repeat2, cn } from "../dependencies";
import { PLAYBACK_SPEEDS, renderInlineItalicText } from "../shared";

export function ListeningTranscriptPanelView1({ scope }: { scope: ListeningTranscriptPanelScope }) {
  const { className, playbackRate, handlePlaybackRateChange, activeIndex, repeatActiveSegment, segments, locationsBySegmentId, showAnswerLocations, segmentRefs, seekToSegment } = scope;
  return (
    (
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
              const speaker = segment.speaker?.trim();
              const showSpeaker = Boolean(speaker) && speaker !== segments[index - 1]?.speaker?.trim();
    
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
                  {showSpeaker ? (
                    <span className="mb-1 inline-flex items-center rounded-md bg-sky-500/14 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-700 dark:bg-sky-400/16 dark:text-sky-200">
                      {speaker}
                    </span>
                  ) : null}
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
                    <span className={cn(hasAnswerLocation && "font-semibold")}>
                      {renderInlineItalicText(segment.text, `${segment.id}-text`)}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )
  );
}
