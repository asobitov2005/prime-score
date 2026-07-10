import { AnswersOverviewCard, ArrowRight, Badge, Button, HistoryRetakeButton, Link, ResultBackGuard, ResultViewTracker, getBackendAttempt, getBackendAttemptResult, getBackendAttemptReview, getTestSourceDetail, notFound } from "./page-dependencies";
import { ExamIntegrityViolationsCard, PerformanceOverviewCard, ScoreSummaryCard } from "./page-part-02";
import { QuestionTypeBreakdownCard, RecommendedNextSteps, SectionBreakdownCard, buildInsightText } from "./page-part-03";
import { buildQuestionTypeBreakdown, buildSectionBreakdown, buildSectionReviewTargets, formatCompletedDate, formatXpAmount, getScoreStatus } from "./page-part-04";
import { buildIntegrityViolationItems, formatBandScore, formatTestFormat, formatTimeTaken } from "./page-part-05";

export interface AttemptResultPageProps {
  params: {
    attemptId: string;
  };
}

export type BreakdownItem = {
  label: string;
  correct: number;
  total: number;
};

export type SectionBreakdownItem = BreakdownItem & {
  title: string;
  reviewLabel: string;
  percent: number;
  href: string;
};

export type QuestionTypeBreakdownItem = BreakdownItem & {
  title: string;
  reviewLabel: string;
  percent: number;
  href: string;
};

export type ReviewTarget = {
  sectionId?: string;
  questionId?: string;
  questionType?: string;
};

export type IntegrityViolationItem = {
  key: string;
  label: string;
  time: string;
};

export async function AttemptResultPage({ params }: AttemptResultPageProps) {
  const result = await getBackendAttemptResult(params.attemptId).catch(() => null);
  if (!result) {
    notFound();
  }

  const attempt = await getBackendAttempt(params.attemptId).catch(() => null);
  const review = await getBackendAttemptReview(params.attemptId).catch(() => null);
  const answerItems = (review?.items ?? []).map((item) => ({
    question_id: item.question_id,
    question_number: item.question_number,
    question_label: item.question_label,
    answer_value: item.answer_value,
    is_correct: item.is_correct,
    correct_answers: item.correct_answers,
  }));
  const totalQuestions = Math.max(0, result.total_questions ?? 0);
  const correctCount = Math.max(0, result.raw_score ?? 0);
  const answeredCount = Math.max(0, result.answered_slots_count ?? result.answers_count ?? 0);
  const incorrectCount = Math.max(0, answeredCount - correctCount);
  const notAnsweredCount = Math.max(0, totalQuestions - answeredCount);
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const estimatedScore = formatBandScore(result.band_score, result.raw_score, result.test_type);
  const formatLabel = formatTestFormat(result.test_format);
  const sourceLabel = getTestSourceDetail(result.source, result.source_detail);
  const completedDate = formatCompletedDate(result.completed_at);
  const completedLabel = completedDate ? `Completed on ${completedDate}` : null;
  const reviewHref = `/exam-preview/${result.test_type === "listening" ? "listening" : "reading"}?attemptId=${params.attemptId}&mode=review&resume=${Date.now()}`;
  const skillLabel = result.test_type === "listening" ? "Listening" : "Reading";
  const sectionTargets = buildSectionReviewTargets(attempt?.test_snapshot ?? null);
  const sectionItems = buildSectionBreakdown(result.section_breakdown, result.test_type, totalQuestions, reviewHref, sectionTargets);
  const questionTypeItems = buildQuestionTypeBreakdown(result.question_type_breakdown, reviewHref);
  const scoreStatus = getScoreStatus(scorePercent);
  const xpEarned = formatXpAmount(result.xp_awarded_total ?? 0);
  const levelAfter = result.xp_level_after ?? 1;
  const currentStreak = result.xp_current_streak ?? 0;
  const integrityViolations = buildIntegrityViolationItems(result.events ?? []);

  return (
    <div className="mx-auto w-full max-w-[82rem] pb-1">
      <ResultBackGuard testType={result.test_type} />
      <ResultViewTracker
        attemptId={params.attemptId}
        testId={result.test_id}
        testTitle={result.test_title ?? "Unknown test"}
        testType={result.test_type}
        testFormat={result.test_format}
        rawScore={result.raw_score}
        totalQuestions={result.total_questions}
        bandScore={result.band_score}
      />

      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-[2rem]">
                {result.test_title ?? "Unknown test"}
              </h1>
              <Badge tone="outline" className="border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {formatLabel}
              </Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              {sourceLabel}
              {completedLabel ? <span>{` · ${completedLabel}`}</span> : null}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <Button
              asChild
              className="h-11 rounded-[10px] bg-orange-500 px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(249,115,22,0.75)] hover:bg-orange-600 dark:text-white"
            >
              <Link href={reviewHref}>
                {"Review Mistakes"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <HistoryRetakeButton
              testId={result.test_id}
              testType={result.test_type}
              mode="practice"
              showModeChooser={!result.test_format || result.test_format === "full"}
              testTitle={result.test_title}
              testFormat={result.test_format}
              idleLabel={"Try Again"}
              className="h-11 rounded-[10px] border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            />
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <ScoreSummaryCard
            correctCount={correctCount}
            totalQuestions={totalQuestions}
            estimatedScore={estimatedScore}
            reviewHref={reviewHref}
            statusLabel={scoreStatus.label}
            statusClassName={scoreStatus.className}
            statusIcon={scoreStatus.icon}
          />
          <PerformanceOverviewCard
            correctCount={correctCount}
            incorrectCount={incorrectCount}
            notAnsweredCount={notAnsweredCount}
            timeTaken={formatTimeTaken(result.time_spent_sec ?? 0)}
            insight={buildInsightText(correctCount, incorrectCount, notAnsweredCount)}
            xpStrip={`+${xpEarned.toLocaleString("en-US")} XP earned · Level ${levelAfter} · ${currentStreak} day streak`}
          />
        </section>

        {integrityViolations.length > 0 ? (
          <ExamIntegrityViolationsCard items={integrityViolations} />
        ) : null}

        <SectionBreakdownCard items={sectionItems} />

        {questionTypeItems.length > 0 ? (
          <QuestionTypeBreakdownCard items={questionTypeItems} />
        ) : null}

        <AnswersOverviewCard items={answerItems} />

        <RecommendedNextSteps
          reviewHref={reviewHref}
          testType={result.test_type}
          skillLabel={skillLabel}
          notAnsweredCount={notAnsweredCount}
        />
      </div>
    </div>
  );
}
