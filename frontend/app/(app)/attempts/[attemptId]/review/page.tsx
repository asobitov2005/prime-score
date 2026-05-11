import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatMatchingAnswerForReview,
  shouldAutoLetterMatchingOptions,
  shouldAutoRomanMatchingOptions,
} from "@/lib/matching-option-format";
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
        {review.diagram_groups.length > 0 ? (
          review.diagram_groups.map((diagram) => (
            <Card key={diagram.group_id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="secondary">Q{diagram.question_start}-{diagram.question_end}</Badge>
                  <Badge tone="outline">{diagram.section_title}</Badge>
                </div>
                <CardTitle className="text-lg">{diagram.diagram_title ?? diagram.group_title}</CardTitle>
                <CardDescription>{diagram.group_title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/15 p-3">
                  <img
                    src={diagram.diagram_image_url}
                    alt={diagram.diagram_title ?? diagram.group_title}
                    className="max-h-[420px] w-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          ))
        ) : null}
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
              <ReviewRow
                label="Your answer"
                value={formatReviewValue(item.question_type, item.answer_value, item.options)}
              />
              <ReviewRow
                label="Correct answers"
                value={formatReviewAnswers(item.question_type, item.correct_answers, item.options)}
              />
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

function formatReviewValue(questionType: string, answerValue: string | null | undefined, options: string[]) {
  if (!shouldFormatMatchingReviewValue(questionType)) {
    return answerValue ?? "No answer";
  }
  return formatMatchingAnswerForReview(answerValue, options, questionType);
}

function formatReviewAnswers(questionType: string, correctAnswers: string[], options: string[]) {
  if (!shouldFormatMatchingReviewValue(questionType)) {
    return correctAnswers.join(", ");
  }
  return correctAnswers
    .map((answer) => formatMatchingAnswerForReview(answer, options, questionType))
    .join(", ");
}

function shouldFormatMatchingReviewValue(questionType: string) {
  return shouldAutoLetterMatchingOptions(questionType) || shouldAutoRomanMatchingOptions(questionType);
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}
