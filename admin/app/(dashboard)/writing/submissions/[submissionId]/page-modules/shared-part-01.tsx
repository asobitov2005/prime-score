"use client";

import { Card, CardContent, CardHeader, CardTitle, WritingSubmission } from "./dependencies";



export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function badgeToneForStatus(status: string): "neutral" | "success" | "warning" | "danger" {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "failed") return "danger";
  if (normalized === "queued" || normalized === "running" || normalized === "processing") return "warning";
  return "neutral";
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

export function CriterionCard({
  title,
  criterion
}: {
  title: string;
  criterion: NonNullable<WritingSubmission["evaluation"]>["task_achievement"];
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{title}</span>
          <span className="text-lg font-bold text-primary">{criterion.band}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="leading-7 text-foreground">{criterion.summary || "No summary saved."}</p>
        {criterion.strengths.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Strengths</p>
            <ul className="mt-2 space-y-2">
              {criterion.strengths.map((item, index) => (
                <li key={`${index}-${item}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {criterion.improvements.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Improvements</p>
            <ul className="mt-2 space-y-2">
              {criterion.improvements.map((item, index) => (
                <li key={`${index}-${item}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
