import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBackendAttemptResult } from "@/lib/server-attempts";

interface AttemptResultPageProps {
  params: {
    attemptId: string;
  };
}

export default async function AttemptResultPage({ params }: AttemptResultPageProps) {
  const result = await getBackendAttemptResult(params.attemptId).catch(() => null);
  if (!result) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card text-foreground">
        <CardHeader className="space-y-2">
          <Badge tone="outline" className="border-border bg-muted text-slate-200">
            Attempt result
          </Badge>
          <CardTitle className="text-3xl text-foreground">{result.test_title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Backend scoring payload is now wired directly into the result page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge tone="secondary">{result.test_type}</Badge>
          <Badge tone={result.score_status === "ready" ? "success" : "warning"}>{result.score_status}</Badge>
          <Badge tone="outline">{result.answers_count}/{result.total_questions} answered</Badge>
          <Button asChild size="sm">
            <Link href={`/attempts/${params.attemptId}/review`}>
              Open review
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Raw score" value={result.raw_score !== null && result.raw_score !== undefined ? String(result.raw_score) : "Pending"} detail="Strict normalized scoring" />
        <MetricCard label="Band score" value={formatBandScore(result.band_score)} detail="Full attempts only" />
        <MetricCard label="Completed at" value={result.completed_at ? new Date(result.completed_at).toLocaleString("en-GB") : "In progress"} detail="Frozen attempt snapshot" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Section breakdown"
          description="Correct answers by section."
          items={result.section_breakdown}
        />
        <BreakdownCard
          title="Question type breakdown"
          description="Correct answers by question family."
          items={result.question_type_breakdown}
        />
      </div>
    </div>
  );
}

function formatBandScore(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : "N/A";
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardHeader>
    </Card>
  );
}

function BreakdownCard({
  title,
  description,
  items
}: {
  title: string;
  description: string;
  items: Array<{ label: string; correct: number; total: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={item.label} className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{item.label.replace(/_/g, " ")}</p>
              <Badge tone={item.correct === item.total ? "success" : item.correct > 0 ? "warning" : "danger"}>
                {item.correct}/{item.total}
              </Badge>
            </div>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">Breakdown will appear once the backend has finished scoring.</p>
        )}
      </CardContent>
    </Card>
  );
}
