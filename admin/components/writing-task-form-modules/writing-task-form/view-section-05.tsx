"use client";
import type { WritingTaskFormScope } from "./controller";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, QUESTION_SUBTYPES_TASK1, QUESTION_SUBTYPES_TASK2, WritingTaskType, cn } from "../dependencies";
import { subtypeIcons } from "../shared";

export function WritingTaskFormSection5({ scope }: { scope: WritingTaskFormScope }) {
  const { state, patchState, errors, onTypeChange, setErrors } = scope;
  return (
    <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title <span className="text-danger">*</span></Label>
                <Input
                  id="title"
                  value={state.title}
                  onChange={(e) => patchState({ title: e.target.value })}
                  maxLength={255}
                  placeholder="e.g. Bar chart: world population growth 1950-2050"
                />
                {errors.title ? <p className="text-xs text-danger">{errors.title}</p> : null}
              </div>
    
              <div className="space-y-2">
                <Label>Task Type <span className="text-danger">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["task_1", "task_2"] as WritingTaskType[]).map((t) => {
                    const active = state.task_type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onTypeChange(t)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
                          active
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                            : "border-border bg-card hover:bg-muted"
                        )}
                      >
                        <span className="text-sm font-bold text-foreground">
                          {t === "task_1" ? "Task 1" : "Task 2"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t === "task_1"
                            ? "Visual description (chart, graph, map, or process). 150 words, 20 minutes."
                            : "Argumentative essay. 250 words, 40 minutes."}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
    
              <div className="space-y-2">
                <Label htmlFor="question_subtype">Question Subtype <span className="text-danger">*</span></Label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(state.task_type === "task_1" ? QUESTION_SUBTYPES_TASK1 : QUESTION_SUBTYPES_TASK2).map((opt) => {
                    const active = state.question_subtype === opt.value;
                    const Icon = subtypeIcons[opt.value];
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          patchState({ question_subtype: opt.value });
                          setErrors((current) => {
                            const next = { ...current };
                            delete next.question_subtype;
                            return next;
                          });
                        }}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                          active
                            ? "border-primary bg-primary/8 text-foreground shadow-sm ring-1 ring-primary/25"
                            : errors.question_subtype
                              ? "border-danger/60 bg-danger/5 text-foreground hover:border-danger hover:bg-danger/8"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                        <span className="whitespace-nowrap">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.question_subtype ? (
                  <p className="text-xs font-semibold text-danger">{errors.question_subtype}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {state.task_type === "task_1"
                      ? "Type of visual: bar chart, line graph, pie chart, etc."
                      : "Essay type: opinion, discussion, problem & solution, etc."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
  );
}
