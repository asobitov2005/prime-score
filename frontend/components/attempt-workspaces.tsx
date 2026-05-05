"use client";

import { useState, useEffect, useRef } from "react";
import { Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFrontendClientApiBaseUrl } from "@/lib/api-base";
import { trackAttemptSubmit } from "@/lib/analytics";
import { getMatchingOptionViewModel, shouldAutoLetterMatchingOptions } from "@/lib/matching-option-format";
import { QuestionRenderer } from "@/components/question-renderer";
import { useUIStore } from "@/store/ui-store";
import type { AttemptWorkspaceMeta, ListeningPart, ReadingPassage, TestSectionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Howl } from "howler";

interface ReadingAttemptWorkspaceProps {
  attemptId: string;
  testTitle: string;
  mode: "practice" | "exam";
  scope: "full" | "section";
  passage: ReadingPassage;
  sections: TestSectionSummary[];
  meta: AttemptWorkspaceMeta;
  initialAnswers?: Record<string, string>;
}

interface ListeningAttemptWorkspaceProps {
  attemptId: string;
  testTitle: string;
  mode: "practice" | "exam";
  scope: "full" | "section";
  part: ListeningPart;
  sections: TestSectionSummary[];
  meta: AttemptWorkspaceMeta;
  initialAnswers?: Record<string, string>;
}

export function ReadingAttemptWorkspace({ attemptId, testTitle, mode, scope, passage, sections, meta, initialAnswers }: ReadingAttemptWorkspaceProps) {
  const apiBaseUrl = getFrontendClientApiBaseUrl();
  const router = useRouter();
  const { activeAttemptTab, setActiveAttemptTab } = useUIStore();
  const visibleTab = activeAttemptTab === "transcript" ? "passage" : activeAttemptTab;
  const [currentQuestionId, setCurrentQuestionId] = useState(passage.questions[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...(initialAnswers ?? {}) }));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(meta.timeLimitSeconds);
  const initialAnswersKey = JSON.stringify(initialAnswers ?? {});

  useEffect(() => {
    setAnswers({ ...(initialAnswers ?? {}) });
  }, [attemptId, initialAnswers, initialAnswersKey]);

  // Full Screen & Anti-cheat Logic
  useEffect(() => {
    if (mode !== "exam") return;

    const enterFullScreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen request failed", err);
      }
    };

    const handleAutoSubmit = (reason: string) => {
      console.warn(`Exam integrity event: ${reason}`);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleAutoSubmit("tab_switch");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmitting) {
        handleAutoSubmit("exit_fullscreen");
      }
    };

    // Initialize Exam Environment
    enterFullScreen();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [mode, attemptId, router, isSubmitting]);

  useEffect(() => {
    if (mode !== "exam" || meta.timeLimitSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, meta.timeLimitSeconds]);

  useEffect(() => {
    if (mode === "exam" && meta.timeLimitSeconds > 0 && timeLeft === 0 && !isSubmitting) {
      setIsSubmitting(true);
      fetch(`${apiBaseUrl}/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true, reason: "time_up" }),
        })
        .then(() => {
          trackAttemptSubmit({
            attemptId,
            testTitle,
            testType: "reading",
            mode,
            scope,
            submitReason: "time_up",
          });
          if (document.fullscreenElement) document.exitFullscreen();
          router.push(`/attempts/${attemptId}/result?reason=time_up`);
        })
        .catch(() => setIsSubmitting(false));
    }
  }, [apiBaseUrl, timeLeft, mode, meta.timeLimitSeconds, isSubmitting, attemptId, router]);

  async function persistAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setSaveState("saving");

    try {
      const response = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          questionId,
          value
        })
      });
      if (!response.ok) {
        throw new Error("Answer save failed.");
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border-border/70 bg-card p-5 text-foreground shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="secondary">Reading attempt</Badge>
              <Badge tone={mode === "practice" ? "success" : "warning"}>{mode}</Badge>
              <Badge tone="outline">{scope}</Badge>
              <Badge tone="outline">{attemptId.slice(0, 8)}</Badge>
            </div>
            <h1 className=" text-2xl font-semibold">{testTitle}</h1>
            <p className="text-sm text-muted-foreground">Split-screen reading layout with mobile passage/question toggles.</p>
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
                  await fetch(`/api/attempts/${attemptId}/submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirm: true, reason: "user_confirmed" }),
                  });
                  trackAttemptSubmit({
                    attemptId,
                    testTitle,
                    testType: "reading",
                    mode,
                    scope,
                    submitReason: "user_confirmed",
                  });
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Passage</p>
                <h2 className=" text-xl font-semibold">{passage.title}</h2>
              </div>
              <div className="flex gap-2 lg:hidden">
                <Button variant={visibleTab === "passage" ? "default" : "outline"} size="sm" onClick={() => setActiveAttemptTab("passage")}>
                  Passage
                </Button>
                <Button variant={visibleTab === "questions" ? "default" : "outline"} size="sm" onClick={() => setActiveAttemptTab("questions")}>
                  Questions
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-5">
            <article className={visibleTab === "questions" ? "hidden lg:block" : "space-y-4"}>
              <div className="rounded-lg border border-border/60 bg-accent/20 p-5">
                <p className="text-sm leading-7 text-foreground">{passage.content}</p>
              </div>
              <div className="grid gap-3">
                {passage.paragraphs.map((paragraph, index) => (
                  <div key={paragraph} className="rounded-lg border border-border/60 bg-background p-4 text-sm leading-6">
                    <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Paragraph {String.fromCharCode(65 + index)}</p>
                    {paragraph}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </Card>

        <div className={visibleTab === "passage" ? "hidden lg:block" : "space-y-4"}>
          <Card className="p-5 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Questions Overview</p>
              <h2 className=" text-xl font-semibold">{passage.subtitle}</h2>
            </div>
            <Badge tone="outline">{sections.length} passages</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {passage.questions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => {
                    setCurrentQuestionId(question.id);
                    document.getElementById(`q-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-bold transition-all shadow-sm ${answers[question.id] ? "ring-2 ring-primary/50" : ""} ${currentQuestionId === question.id ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-foreground hover:bg-muted/80"}`}
                >
                  {question.label ?? question.number}
                </button>
              ))}
          </div>
        </Card>

        <div className="space-y-8 pb-20">
          {passage.questionGroups.map((group) => {
            const groupQuestions = passage.questions.filter(q => q.number >= group.questionStart && q.number <= group.questionEnd);
            const isMatching = group.type.includes("matching") || group.type.includes("wordbank");
            const groupInstructions = (group as { instructions?: string }).instructions ?? group.title;
            const groupOptions = (group as { options?: string[] }).options ?? [];
            
            return (
              <Card key={group.id} className="overflow-hidden border-border/50 shadow-md">
                <div className="bg-muted/20 p-6 border-b border-border/40 space-y-4">
                  <div className="inline-flex px-3 py-1 rounded-md bg-primary/10 text-primary text-sm font-black uppercase tracking-widest">
                    Questions {group.questionStart}-{group.questionEnd}
                  </div>
                  <p className="text-base md:text-[17px] font-medium leading-relaxed text-foreground whitespace-pre-wrap">
                    {groupInstructions}
                  </p>
                </div>

                {group.type.includes("diagram") && group.diagramImageUrl ? (
                  <div className="bg-background p-6 border-b border-border/40">
                    {group.diagramTitle ? (
                      <p className="mb-4 text-center text-[17px] font-bold tracking-tight text-foreground">
                        {group.diagramTitle}
                      </p>
                    ) : null}
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/10 p-3">
                      <img
                        src={group.diagramImageUrl}
                        alt={group.diagramTitle || group.title}
                        className="max-h-[340px] w-full object-contain"
                      />
                    </div>
                  </div>
                ) : null}
                
                {isMatching && groupOptions.length > 0 && (
                  <div className="bg-background p-6 border-b border-border/40">
                    <div className="rounded-xl border border-border/60 bg-muted/10 p-5 shadow-inner">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">List of Options / Headings</p>
                      <div className="flex flex-col gap-2.5 max-w-3xl mx-auto">
                        {groupOptions.map((opt: string, i: number) => {
                          const optionView = getMatchingOptionViewModel(opt, i, group.type);
                          const isAutoLettered = shouldAutoLetterMatchingOptions(group.type);
                          const prefix = optionView.hasExplicitPrefix || isAutoLettered
                            ? `${optionView.value}.`
                            : optionView.value;
                          const text = optionView.text || optionView.label;
                          
                          return (
                            <div key={i} className="flex text-sm md:text-[15px] font-medium p-2.5 rounded-xl hover:bg-muted/50 transition-colors bg-background/50 border border-border/30">
                               <span className="font-black text-foreground shrink-0 w-16 text-right pr-4 border-r border-border/50">{prefix}</span>
                               <span className="text-foreground pl-4 flex-1">{text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                <CardContent className="p-6 space-y-6 bg-background/30">
                  {groupQuestions.map((question) => (
                    <div 
                      id={`q-${question.id}`}
                      key={question.id} 
                      className={cn(
                        "transition-all duration-300 p-4 rounded-xl border border-transparent",
                        currentQuestionId === question.id ? "bg-muted/30 border-border/50 shadow-sm" : "opacity-80 hover:opacity-100"
                      )}
                      onClick={() => setCurrentQuestionId(question.id)}
                    >
                      <QuestionRenderer
                        question={question}
                        compact
                        value={answers[question.id] ?? ""}
                        onValueChange={(value: string) => void persistAnswer(question.id, value)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

export function ListeningAttemptWorkspace({
  attemptId,
  testTitle,
  mode,
  scope,
  part,
  sections,
  meta,
  initialAnswers
}: ListeningAttemptWorkspaceProps) {
  const apiBaseUrl = getFrontendClientApiBaseUrl();
  const router = useRouter();
  const { activeAttemptTab, setActiveAttemptTab } = useUIStore();
  const [activeSegment, setActiveSegment] = useState(part.segments[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...(initialAnswers ?? {}) }));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(meta.timeLimitSeconds);
  const initialAnswersKey = JSON.stringify(initialAnswers ?? {});

  useEffect(() => {
    setAnswers({ ...(initialAnswers ?? {}) });
  }, [attemptId, initialAnswers, initialAnswersKey]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const howlRef = useRef<Howl | null>(null);

  // Full Screen & Anti-cheat Logic
  useEffect(() => {
    if (mode !== "exam") return;

    const enterFullScreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen request failed", err);
      }
    };

    const handleAutoSubmit = (reason: string) => {
      console.warn(`Exam integrity event: ${reason}`);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleAutoSubmit("tab_switch");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmitting) {
        handleAutoSubmit("exit_fullscreen");
      }
    };

    enterFullScreen();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [mode, attemptId, router, isSubmitting]);

  useEffect(() => {
    if (mode !== "exam" || meta.timeLimitSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, meta.timeLimitSeconds]);

  useEffect(() => {
    if (mode === "exam" && meta.timeLimitSeconds > 0 && timeLeft === 0 && !isSubmitting) {
      setIsSubmitting(true);
      fetch(`${apiBaseUrl}/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true, reason: "time_up" }),
        })
        .then(() => {
          trackAttemptSubmit({
            attemptId,
            testTitle,
            testType: "listening",
            mode,
            scope,
            submitReason: "time_up",
          });
          if (document.fullscreenElement) document.exitFullscreen();
          router.push(`/attempts/${attemptId}/result?reason=time_up`);
        })
        .catch(() => setIsSubmitting(false));
    }
  }, [apiBaseUrl, timeLeft, mode, meta.timeLimitSeconds, isSubmitting, attemptId, router]);

  useEffect(() => {
    const audioUrl = (part as any).audioUrl || (part as any).audioAssetKey || "/dummy.mp3";
    const sound = new Howl({
      src: [audioUrl],
      html5: true,
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onend: () => setIsPlaying(false),
    });
    howlRef.current = sound;

    return () => {
      sound.unload();
    };
  }, [part]);

  useEffect(() => {
    let animationFrame: number;
    const updateProgress = () => {
      if (howlRef.current && isPlaying) {
        const seek = howlRef.current.seek() as number;
        const duration = howlRef.current.duration();
        setProgress(duration > 0 ? seek / duration : 0);
      }
      animationFrame = requestAnimationFrame(updateProgress);
    };
    if (isPlaying) {
      animationFrame = requestAnimationFrame(updateProgress);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  async function persistAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setSaveState("saving");

    try {
      const response = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          questionId,
          value
        })
      });
      if (!response.ok) {
        throw new Error("Answer save failed.");
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
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
                  await fetch(`/api/attempts/${attemptId}/submit`, {
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
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
