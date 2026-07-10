"use client";

import { Activity, AlertCircle, Clock3, Lock, Mic, PART_2_NOTES_MAX, Wifi, cn } from "./part-2-live-view-dependencies";
import { Part2LiveViewProps, greenWaveformBars } from "./part-2-live-view-part-01";
import { CueCardStage, ExaminerStage } from "./part-2-live-view-part-03";
import { SidebarCard, StatusPill, StatusRow, buildDisplayBars, formatTimer } from "./part-2-live-view-part-04";

export function Part2LiveView({
  live,
  cueCard,
  viewPhase,
  notes,
  topicLabel,
  connectionOnline,
  onNotesChange,
  onListenAgain,
  onEndTest,
  endDisabled = false,
}: Part2LiveViewProps) {
  const showExaminerStage = viewPhase === "examiner" || viewPhase === "speaking";
  const showCueCard = viewPhase === "preparation";
  const showNotes = viewPhase === "preparation" || viewPhase === "speaking";
  const compactExaminerStage = viewPhase === "speaking" && showNotes;

  const isAiSpeaking = live.status === "ai_speaking";
  const isListening = live.status === "listening" && live.inputTurnOpen;
  const isConnecting = !live.isInterviewStarted || live.status === "connecting" || live.status === "ready";
  const audioDetected = isListening && live.inputLevel > 0.012;
  const micOn = live.isRecording && !live.micError;
  const connectionLabel = connectionOnline && live.status !== "error" ? "Stable connection" : "Reconnecting";
  const connectionHealthy = connectionOnline && live.status !== "error";
  const showAiVoice = isAiSpeaking || isConnecting;
  const greenBars = buildDisplayBars(greenWaveformBars, isListening ? live.inputLevel : 0);

  const examinerStatus = viewPhase === "preparation"
    ? "Preparing your response..."
    : isConnecting
      ? "Connecting to examiner..."
      : isAiSpeaking
        ? "AI is speaking"
        : isListening
          ? "Listening to your answer..."
          : "Waiting for your answer";

  const userStatus = viewPhase === "preparation"
    ? "Use this time to plan your answer"
    : isListening
      ? "Listening to your answer..."
      : isAiSpeaking
        ? "Wait while the examiner speaks"
        : isConnecting
          ? "Preparing your microphone..."
          : "Ready for your answer";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_12px_40px_-32px_rgba(15,23,42,0.16)]">
      {live.error ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:mx-5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{live.error}</span>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_256px] lg:gap-4 lg:p-4">
        <article className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] p-3 lg:gap-3 lg:p-4">
          <div className={cn("relative min-h-0", compactExaminerStage ? "min-h-[250px]" : "min-h-[340px]")}>
            <div
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-out",
                showExaminerStage
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-0",
              )}
              aria-hidden={!showExaminerStage}
            >
              <ExaminerStage
                live={live}
                isAiSpeaking={isAiSpeaking}
                isListening={isListening}
                isConnecting={isConnecting}
                showAiVoice={showAiVoice}
                greenBars={greenBars}
                examinerStatus={examinerStatus}
                userStatus={userStatus}
                onEndTest={onEndTest}
                endDisabled={endDisabled}
                compact={compactExaminerStage}
              />
            </div>

            <div
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-out",
                showCueCard
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0",
              )}
              aria-hidden={!showCueCard}
            >
              <CueCardStage cueCard={cueCard} onListenAgain={onListenAgain} />
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-out",
              showNotes ? "max-h-[200px] translate-y-0 opacity-100" : "max-h-0 translate-y-2 opacity-0",
            )}
            aria-hidden={!showNotes}
          >
            <label htmlFor="part-2-live-notes" className="text-sm font-semibold text-[#0F172A]">
              Your notes (optional)
            </label>
            <div className="relative mt-1.5">
              <textarea
                id="part-2-live-notes"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value.slice(0, PART_2_NOTES_MAX))}
                placeholder="Write your ideas here..."
                className={cn(
                  "w-full resize-y rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15",
                  compactExaminerStage ? "min-h-[88px]" : "min-h-[120px]",
                )}
              />
              <p className="pointer-events-none absolute bottom-3 right-3 text-xs font-medium text-[#94A3B8]">
                {notes.length} / {PART_2_NOTES_MAX}
              </p>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2">
            <StatusPill className="w-full justify-center text-[#7C3AED]">
              Part 2 · Individual Long Turn
            </StatusPill>
            <div className="grid grid-cols-2 gap-2">
              <StatusPill className="justify-center">
                <Clock3 className="h-3.5 w-3.5 text-[#64748B]" />
                {formatTimer(live.elapsedSeconds)}
              </StatusPill>
              <StatusPill className={cn("justify-center", connectionHealthy ? "text-[#10B981]" : "text-[#64748B]")}>
                <Wifi className={cn("h-3.5 w-3.5", connectionHealthy ? "text-[#10B981]" : "text-[#64748B]")} />
                {connectionHealthy ? "Connected" : "Offline"}
              </StatusPill>
            </div>
          </div>

          <SidebarCard title="Stage">
            <p className="text-lg font-bold leading-snug text-[#0F172A]">
              {viewPhase === "examiner" ? "Examiner introduction" : viewPhase === "preparation" ? "Preparation" : "Long turn"}
            </p>
          </SidebarCard>

          <SidebarCard title="Topic">
            <p className="text-lg font-bold leading-snug text-[#0F172A]">{topicLabel || "Selected topic"}</p>
          </SidebarCard>

          <SidebarCard title="System status">
            <div className="space-y-2">
              <StatusRow
                icon={<Mic className="h-4 w-4 text-[#10B981]" />}
                label={viewPhase === "preparation" ? "Mic paused for prep" : micOn ? "Mic on" : live.micError ? "Mic issue" : "Mic starting"}
                healthy={viewPhase === "preparation" ? true : micOn}
              />
              <StatusRow
                icon={<Activity className="h-4 w-4 text-[#10B981]" />}
                label={viewPhase === "preparation" ? "Planning time" : audioDetected ? "Audio detected" : isListening ? "Listening..." : "Waiting for speech"}
                healthy={viewPhase === "preparation" || audioDetected || isListening}
              />
              <StatusRow
                icon={<Wifi className="h-4 w-4 text-[#10B981]" />}
                label={connectionLabel}
                healthy={connectionHealthy}
              />
            </div>
          </SidebarCard>

          <p className="flex items-start justify-center gap-2 px-1 text-center text-xs leading-5 text-[#64748B]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your answers are analyzed after the test.
          </p>
        </aside>
      </div>
    </section>
  );
}
