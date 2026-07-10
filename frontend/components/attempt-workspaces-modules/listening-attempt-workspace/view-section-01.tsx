"use client";
import type { ListeningAttemptWorkspaceScope } from "./controller";
import { Badge, Button, Card, Pause, Play, QuestionRenderer, SkipForward, Volume2, emitNotificationRefresh, fetchInternalUserApi, trackAttemptSubmit } from "../dependencies";
import { formatClock, formatDuration } from "../shared";

export function ListeningAttemptWorkspaceView1({ scope }: { scope: ListeningAttemptWorkspaceScope }) {
  const { mode, scope, attemptId, testTitle, meta, timeLeft, saveState, isSubmitting, setIsSubmitting, router, part, activeAttemptTab, setActiveAttemptTab, howlRef, isPlaying, setProgress, progress, activeSegment, setActiveSegment, sections, answers, persistAnswer } = scope;
  return (
    (
        <div className="space-y-5">
          <Card className="border-border/70 bg-card p-5 text-foreground shadow-none">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="secondary">Listening attempt</Badge>
                  <Badge tone={mode === "practice" ? "success" : "warning"}>{mode}</Badge>
                  <Badge tone="outline">{scope}</Badge>
                  <Badge tone="outline">{attemptId.slice(0, 8)}</Badge>
                </div>
                <h1 className=" text-2xl font-semibold">{testTitle}</h1>
                <p className="text-sm text-muted-foreground">Split-screen listening layout with sticky audio controls and transcript/question toggles.</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge tone="outline">{meta.timeLimitSeconds ? formatDuration(mode === "exam" ? timeLeft : meta.timeLimitSeconds) : "Untimed"}</Badge>
                <Badge tone="outline">{meta.currentSectionTitle}</Badge>
                <Badge tone="outline">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Autosave ready"}</Badge>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={async () => {
                    try {
                      setIsSubmitting(true);
                      await fetchInternalUserApi(`/internal-api/attempts/${attemptId}/submit`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ confirm: true, reason: "user_confirmed" }),
                      });
                      trackAttemptSubmit({
                        attemptId,
                        testTitle,
                        testType: "listening",
                        mode,
                        scope,
                        submitReason: "user_confirmed",
                      });
                      emitNotificationRefresh();
                      router.push(`/attempts/${attemptId}/result`);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </Card>
    
          <Card className="sticky top-4 z-20 overflow-hidden">
            <div className="border-b border-border/70 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Audio</p>
                  <h2 className=" text-xl font-semibold">{part.title}</h2>
                </div>
                <div className="flex gap-2 lg:hidden">
                  <Button variant={activeAttemptTab === "transcript" ? "default" : "outline"} size="sm" onClick={() => setActiveAttemptTab("transcript")}>
                    Transcript
                  </Button>
                  <Button variant={activeAttemptTab === "questions" ? "default" : "outline"} size="sm" onClick={() => setActiveAttemptTab("questions")}>
                    Questions
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">
                  {mode === "exam"
                    ? `Time remaining: ${formatDuration(timeLeft)}`
                    : `Listening timer target: ${formatDuration(meta.timeLimitSeconds)}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => howlRef.current?.pause()} disabled={!isPlaying}>
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                  <Button size="sm" onClick={() => howlRef.current?.play()} disabled={isPlaying}>
                    <Play className="h-4 w-4" />
                    Play
                  </Button>
                </div>
              </div>
            <div 
              className={`mt-4 h-2 rounded-full bg-muted overflow-hidden relative ${mode === "practice" ? "cursor-pointer" : ""}`}
              onClick={(e) => {
                if (!howlRef.current || mode !== "practice") return;
                const bounds = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - bounds.left;
                const percent = Math.max(0, Math.min(1, x / bounds.width));
                howlRef.current.seek(percent * howlRef.current.duration());
                setProgress(percent);
              }}
            >
              <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="h-4 w-4" />
              <span>{mode === "practice" ? "Seek is available in practice mode." : "Audio controls stay visible during exam mode."}</span>
            </div>
            </div>
          </Card>
    
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Transcript</p>
                  <h2 className=" text-xl font-semibold">{part.subtitle}</h2>
                </div>
                <div className="flex gap-2 lg:hidden">
                  <Button variant={activeAttemptTab === "transcript" ? "default" : "outline"} size="sm" onClick={() => setActiveAttemptTab("transcript")}>
                    Transcript
                  </Button>
                  <Button variant={activeAttemptTab === "questions" ? "default" : "outline"} size="sm" onClick={() => setActiveAttemptTab("questions")}>
                    Questions
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {part.segments.map((segment) => {
                  const active = activeSegment === segment.id;
                  return (
                    <button
                      key={segment.id}
                      type="button"
                      onClick={() => {
                        setActiveSegment(segment.id);
                        if (howlRef.current && mode === "practice") {
                          howlRef.current.seek(segment.startSecond);
                        }
                      }}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${active ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-accent/40"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{segment.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatClock(segment.startSecond)} - {formatClock(segment.endSecond)}
                          </p>
                        </div>
                        <SkipForward className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 rounded-lg border border-border/60 bg-accent/20 p-4 text-sm leading-6 text-foreground">{part.transcriptSummary}</p>
            </Card>
    
            <div className={activeAttemptTab === "transcript" ? "hidden lg:block" : "space-y-4"}>
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Questions</p>
                    <h2 className=" text-xl font-semibold">Part questions</h2>
                  </div>
                  <Badge tone="outline">{sections.length} sections</Badge>
                </div>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Question groups</p>
                <div className="mt-4 space-y-3">
                  {part.questionGroups.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border/60 bg-accent/20 px-4 py-3">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.type.replace(/_/g, " ")} · Q{item.questionStart}-Q{item.questionEnd}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="space-y-4">
                {part.questions.map((question) => (
                  <QuestionRenderer
                    key={question.id}
                    question={question}
                    compact
                    value={answers[question.id] ?? ""}
                    onValueChange={(value: string) => void persistAnswer(question.id, value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )
  );
}
