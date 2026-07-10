"use client";
import type { UserDetailPageScope } from "./controller";
import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from "../dependencies";
import { InfoRow, fmt, humanizeStatus, statusTone } from "../shared";

export function UserDetailPageSection13({ scope }: { scope: UserDetailPageScope }) {
  const { activityError, activity, setSelectedAttemptId, selectedAttempt } = scope;
  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Reading / Listening attempts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityError ? (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                    {activityError}
                  </div>
                ) : activity?.attempts.length ? (
                  activity.attempts.map((attempt) => (
                    <button
                      key={attempt.attempt_id}
                      type="button"
                      onClick={() => setSelectedAttemptId(attempt.attempt_id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                        selectedAttempt?.attempt_id === attempt.attempt_id
                          ? "border-primary bg-primary/8"
                          : "border-border/60 bg-muted/10 hover:bg-muted/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{attempt.test_title || "Untitled attempt"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {(attempt.test_type ?? "test").toUpperCase()} · {fmt(attempt.completed_at || attempt.started_at)}
                          </p>
                        </div>
                        <Badge tone={statusTone(attempt.status)} className="text-[10px] uppercase font-black tracking-widest">
                          {humanizeStatus(attempt.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Band: {attempt.band_score ?? "—"}</span>
                        <span>Raw: {attempt.raw_score ?? "—"}</span>
                        <span>{attempt.answers_count}/{attempt.total_questions} answered</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                    Attemptlar topilmadi.
                  </div>
                )}
              </CardContent>
            </Card>
    
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Selected attempt detail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {!selectedAttempt ? (
                  <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                    Ko‘rish uchun attempt tanlang.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(selectedAttempt.status)} className="text-[10px] uppercase font-black tracking-widest">
                        {humanizeStatus(selectedAttempt.status)}
                      </Badge>
                      <Badge tone="neutral" className="text-[10px] uppercase font-black tracking-widest">
                        Score {humanizeStatus(selectedAttempt.score_status)}
                      </Badge>
                      <Badge tone="neutral" className="text-[10px] uppercase font-black tracking-widest">
                        Band {selectedAttempt.band_score ?? "—"}
                      </Badge>
                    </div>
    
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoRow label="Test" value={selectedAttempt.test_title || "—"} />
                      <InfoRow label="Type" value={selectedAttempt.test_type?.toUpperCase() ?? "—"} />
                      <InfoRow label="Mode" value={selectedAttempt.mode} />
                      <InfoRow label="Scope" value={selectedAttempt.scope} />
                      <InfoRow label="Started" value={fmt(selectedAttempt.started_at)} />
                      <InfoRow label="Completed" value={fmt(selectedAttempt.completed_at)} />
                      <InfoRow label="Answered" value={`${selectedAttempt.answers_count}/${selectedAttempt.total_questions}`} />
                      <InfoRow label="Worked slots" value={String(selectedAttempt.answered_slots_count)} />
                    </div>
    
                    {selectedAttempt.result?.section_breakdown.length ? (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Section breakdown</p>
                        {selectedAttempt.result.section_breakdown.map((item) => (
                          <div key={item.label} className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-medium text-foreground">{item.label}</span>
                              <span className="text-muted-foreground">{item.correct}/{item.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
    
                    {selectedAttempt.result?.question_type_breakdown.length ? (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Question types</p>
                        {selectedAttempt.result.question_type_breakdown.map((item) => (
                          <div key={item.label} className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-medium text-foreground">{item.label}</span>
                              <span className="text-muted-foreground">{item.correct}/{item.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
    
                    {selectedAttempt.review?.items.length ? (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Answer review</p>
                        {selectedAttempt.review.items.map((item) => (
                          <div key={item.question_id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">
                                  Q{item.question_number}{item.question_label ? ` · ${item.question_label}` : ""}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">{item.prompt}</p>
                              </div>
                              <Badge tone={item.is_correct ? "success" : "danger"} className="text-[10px] uppercase font-black tracking-widest">
                                {item.is_correct ? "Correct" : "Wrong"}
                              </Badge>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                              <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">User answer</p>
                                <p className="mt-1 text-foreground">{item.answer_value || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Correct answer</p>
                                <p className="mt-1 text-foreground">{item.correct_answers.join(", ") || "—"}</p>
                              </div>
                            </div>
                            <div className="mt-3 text-sm text-muted-foreground">
                              {selectedAttempt.review?.can_show_explanations
                                ? (item.explanation || "No explanation attached.")
                                : "Premium required for explanations."}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
  );
}
