import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBackendAttemptReview } from "@/lib/server-attempts";

interface AttemptReviewPageProps {
  params: {
    attemptId: string;
  };
}

export default async function AttemptReviewPage({ params }: AttemptReviewPageProps) {
  const review = await getBackendAttemptReview(params.attemptId).catch(() => null);
  if (!review) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card text-foreground">
        <CardHeader className="space-y-2">
          <Badge tone="outline" className="border-border bg-muted text-slate-200">
            Attempt review
          </Badge>
          <CardTitle className="text-3xl text-foreground">{review.test_title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Correct answers, user answers, and premium-only explanations are now driven by backend review payloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge tone="secondary">{review.test_type ?? "unknown"}</Badge>
          <Badge tone={review.can_show_explanations ? "success" : "warning"}>
            {review.can_show_explanations ? "Explanations unlocked" : "Premium required for explanations"}
          </Badge>
          <Badge tone="outline">{review.items.length} questions</Badge>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {review.items.map((item) => (
          <Card key={item.question_id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="secondary">Q{item.question_number}</Badge>
                <Badge tone={item.is_correct ? "success" : "danger"}>
                  {item.is_correct ? "Correct" : "Incorrect"}
                </Badge>
                <Badge tone="outline">{item.question_type.replace(/_/g, " ")}</Badge>
              </div>
              <CardTitle className="text-lg">{item.prompt}</CardTitle>
              <CardDescription>{item.section_title} · {item.group_title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ReviewRow label="Your answer" value={item.answer_value ?? "No answer"} />
              <ReviewRow label="Correct answers" value={item.correct_answers.join(", ")} />
              <ReviewRow
                label="Explanation"
                value={review.can_show_explanations ? (item.explanation ?? "No explanation attached.") : "Upgrade to premium to view explanations."}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}
