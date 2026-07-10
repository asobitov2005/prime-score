"use client";

import { AdminDraftChecklistStatus, AdminTestDraftState, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ReactNode, WizardStepId, cn, useMemo } from "./dependencies";

import { totalQuestionSlots } from "./shared-part-04";

import { collectGroupIssues } from "./shared-part-05";



export function ReviewPanel({ draft }: { draft: AdminTestDraftState }) {
  const validations = useMemo(() => {
    const checks: { label: string; status: "success" | "warning" | "error"; detail: string }[] = [];
    
    // Metadata checks
    if (!draft.metadata.title) checks.push({ label: "Title", status: "error", detail: "Test title is required." });
    
    // Content checks
    if (draft.content.sections.length === 0) {
      checks.push({ label: "Sections", status: "error", detail: "At least one passage/section is required." });
    } else {
      draft.content.sections.forEach((s, i) => {
        if (!s.content || s.content.length < 50) {
          checks.push({ label: `Section ${i+1} Content`, status: "warning", detail: "Content seems too short or empty." });
        }
      });
    }

    // Question Group checks
    const groups = draft.questionGroups ?? [];
    if (groups.length === 0) {
      checks.push({ label: "Questions", status: "error", detail: "No question groups created." });
    } else {
      let totalQ = 0;
      groups.forEach((g) => {
        totalQ += totalQuestionSlots(g);
        if (g.questions.length === 0) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "This group has no questions." });
        }
        if (g.questionEnd < g.questionStart) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "Question range is invalid (End < Start)." });
        }
        for (const issue of collectGroupIssues(g, draft.content.sections)) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: issue });
        }
      });
      
      if (draft.metadata.type === "reading" && totalQ < 40) {
        checks.push({ label: "Question Count", status: "warning", detail: `Full reading usually has 40 questions (currently ${totalQ}).` });
      }
    }

    return checks;
  }, [draft]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Automated Validation</CardTitle>
            <CardDescription>System checks for structure, numbering, and completeness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {validations.map((v, i) => (
              <div key={i} className={cn(
                "rounded-md border px-4 py-3 flex items-center justify-between gap-3",
                v.status === "error" ? "border-danger/30 bg-danger/5" : v.status === "warning" ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"
              )}>
                <div>
                  <p className="font-medium text-sm">{v.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.detail}</p>
                </div>
                <Badge tone={v.status === "error" ? "danger" : v.status === "warning" ? "warning" : "success"}>
                  {v.status.toUpperCase()}
                </Badge>
              </div>
            ))}
            {validations.length === 0 && (
              <p className="text-sm text-center py-4 text-muted-foreground">No issues found. Ready to publish!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <CardDescription>Review state is derived from the draft.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.review.checklist.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-card/45 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publisher notes</CardTitle>
          <CardDescription>Critical reminders before publish.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <div className="bg-muted p-4 rounded-lg border border-border space-y-2">
            <p className="font-semibold text-foreground">Summary Statistics</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>Type: <span className="text-foreground uppercase">{draft.metadata.type}</span></p>
              <p>Access: <span className="text-foreground uppercase">{draft.metadata.accessType}</span></p>
              <p>Sections: <span className="text-foreground">{draft.content.sections.length}</span></p>
              <p>Groups: <span className="text-foreground">{draft.questionGroups?.length ?? 0}</span></p>
              <p>Total Questions: <span className="text-foreground">{(draft.questionGroups ?? []).reduce((acc, g) => acc + totalQuestionSlots(g), 0)}</span></p>
            </div>
          </div>
          <div className="space-y-3">
            {draft.review.notes.map((note) => (
              <p key={note}>• {note}</p>
            ))}
            <p>• <code>{"{{N}}"}</code> markers stay canonical for every completion renderer.</p>
            <p>• Explanations remain premium-only at runtime, even for public tests.</p>
            <p>• Published edits create a new version and preserve attempt snapshots.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-card/45 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}

export function EditableField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card/45 px-4 py-3">
      <p className="break-words text-xs uppercase leading-snug tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

export function stepLabel(step: WizardStepId): string {
  if (step === "metadata") return "Metadata";
  if (step === "content") return "Content";
  if (step === "questions") return "Questions";
  return "Review";
}

export function stepDescription(step: WizardStepId, draft: AdminTestDraftState): string {
  if (step === "metadata") return `${draft.metadata.type} · ${draft.metadata.timeLimitLabel}`;
  if (step === "content") return `${draft.content.sections.length} content sections`;
  if (step === "questions") return `${draft.questions.length} draft questions`;
  return `${draft.review.checklist.length} review checks`;
}

export function statusTone(status: AdminDraftChecklistStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "ready") return "success";
  if (status === "blocked") return "danger";
  return "warning";
}
