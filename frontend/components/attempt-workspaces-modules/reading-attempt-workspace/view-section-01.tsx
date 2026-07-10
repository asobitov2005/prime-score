"use client";
import type { ReadingAttemptWorkspaceScope } from "./controller";
import { Badge, Button, Card, CardContent, QuestionRenderer, cn, emitNotificationRefresh, fetchInternalUserApi, getMatchingOptionViewModel, shouldAutoLetterMatchingOptions, trackAttemptSubmit } from "../dependencies";
import { formatDuration } from "../shared";

export function ReadingAttemptWorkspaceView1({ scope }: { scope: ReadingAttemptWorkspaceScope }) {
  const { mode, scope, attemptId, testTitle, meta, timeLeft, saveState, isSubmitting, setIsSubmitting, router, passage, visibleTab, setActiveAttemptTab, sections, setCurrentQuestionId, answers, currentQuestionId, persistAnswer } = scope;
  return (
    (
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
                      await fetchInternalUserApi(`/internal-api/attempts/${attemptId}/submit`, {
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
      )
  );
}
