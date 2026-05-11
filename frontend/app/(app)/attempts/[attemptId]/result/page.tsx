import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock3, Minus, XCircle } from "lucide-react";
import { AnswersOverviewCard } from "./answers-overview-card";
import { ResultBackGuard } from "./result-back-guard";
import { ResultViewTracker } from "./result-view-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompletedAtLabel } from "@/lib/date-time";
import { getLeaderboardRank } from "@/lib/server-me";
import { getBackendAttemptResult, getBackendAttemptReview } from "@/lib/server-attempts";
import { getTestSourceDetail } from "@/lib/test-source";
import type { TestType } from "@/lib/types";

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
  const review = await getBackendAttemptReview(params.attemptId).catch(() => null);
  const leaderboardRank = await getLeaderboardRank(result.test_type).catch(() => null);

  const formatLabel = formatTestFormat(result.test_format);
  const sourceLabel = getTestSourceDetail(result.source, result.source_detail);
  const completedLabel = formatCompletedAtLabel(result.completed_at);
  const correctCount = Math.max(0, result.raw_score ?? 0);
  const answeredCount = Math.max(0, result.answered_slots_count ?? result.answers_count ?? 0);
  const totalQuestions = Math.max(0, result.total_questions ?? 0);
  const incorrectCount = Math.max(0, answeredCount - correctCount);
  const notAnsweredCount = Math.max(0, totalQuestions - answeredCount);
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const estimatedScore = formatBandScore(result.band_score, result.raw_score, result.test_type);
  const percentile = formatPercentile(result.band_score, result.raw_score, result.test_type, scorePercent);
  const reviewHref = `/exam-preview/${result.test_type === "listening" ? "listening" : "reading"}?attemptId=${params.attemptId}&mode=review&resume=${Date.now()}`;

  return (
    <div className="space-y-3">
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
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-0.5 px-0 pb-0 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <CardTitle className="text-3xl text-foreground">{result.test_title}</CardTitle>
              <Badge tone="outline" className="border-border/70 bg-muted/40 text-foreground">
                {formatLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button asChild size="sm">
                <Link href={reviewHref}>
                  Review Answers
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/tests/${result.test_id}`}>
                  Try Again
                </Link>
              </Button>
            </div>
          </div>
          <CardDescription className="-mt-2 flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
            <span>
              {sourceLabel}
              {completedLabel ? <span>{` • ${completedLabel}`}</span> : null}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="-mt-[110px] grid gap-4 xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)]">
        <ScoreCard
          correctCount={correctCount}
          totalQuestions={totalQuestions}
          scorePercent={scorePercent}
        />
        <PerformanceOverviewCard
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          notAnsweredCount={notAnsweredCount}
          timeTaken={formatTimeTaken(result.time_spent_sec ?? 0)}
          estimatedScore={estimatedScore}
          percentile={percentile}
          leaderboardRank={leaderboardRank}
        />
      </div>

      <SectionBreakdownCard
        items={result.section_breakdown}
        testType={result.test_type}
      />

      <div className="grid gap-6">
        <BreakdownCard
          title="Question type breakdown"
          items={result.question_type_breakdown}
        />
      </div>

      <AnswersOverviewCard items={review?.items ?? []} testFormat={result.test_format ?? "full"} />

      {result.diagram_groups.length > 0 ? (
        <div className="space-y-4">
          {result.diagram_groups.map((diagram) => (
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
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatTestFormat(value: string | null | undefined): string {
  if (!value || value === "full") {
    return "Full Test";
  }
  return value.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveBandScore(
  value: number | string | null | undefined,
  rawScore: number | null | undefined,
  testType: TestType
): number | null {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  if (rawScore === null || rawScore === undefined) {
    return null;
  }

  const table = testType === "listening"
    ? [
        [39, 40, 9.0],
        [37, 38, 8.5],
        [35, 36, 8.0],
        [32, 34, 7.5],
        [30, 31, 7.0],
        [26, 29, 6.5],
        [23, 25, 6.0],
        [18, 22, 5.5],
        [16, 17, 5.0],
        [13, 15, 4.5],
        [11, 12, 4.0],
        [8, 10, 3.5],
        [6, 7, 3.0],
        [4, 5, 2.5],
        [3, 3, 2.0],
        [2, 2, 1.0],
      ]
    : [
        [39, 40, 9.0],
        [37, 38, 8.5],
        [35, 36, 8.0],
        [33, 34, 7.5],
        [30, 32, 7.0],
        [27, 29, 6.5],
        [23, 26, 6.0],
        [19, 22, 5.5],
        [15, 18, 5.0],
        [13, 14, 4.5],
        [10, 12, 4.0],
        [8, 9, 3.5],
        [6, 7, 3.0],
        [4, 5, 2.5],
        [3, 3, 2.0],
        [2, 2, 1.0],
      ];

  const normalizedRawScore = Math.max(0, Math.floor(rawScore));
  const match = table.find(([min, max]) => normalizedRawScore >= min && normalizedRawScore <= max);
  return match ? match[2] : null;
}

function formatBandScore(
  value: number | string | null | undefined,
  rawScore: number | null | undefined,
  testType: TestType
): string {
  const derivedBandScore = deriveBandScore(value, rawScore, testType);
  if (derivedBandScore === null) {
    return "—";
  }
  return derivedBandScore.toFixed(1);
}

function formatPercentile(
  value: number | string | null | undefined,
  rawScore: number | null | undefined,
  testType: TestType,
  scorePercent: number
): string {
  const numericValue = deriveBandScore(value, rawScore, testType);
  if (numericValue === null) {
    return `${Math.max(1, Math.min(99, scorePercent))}th`;
  }

  const band = numericValue;
  const lookup = [
    { band: 9.0, percentile: 99 },
    { band: 8.5, percentile: 97 },
    { band: 8.0, percentile: 95 },
    { band: 7.5, percentile: 90 },
    { band: 7.0, percentile: 84 },
    { band: 6.5, percentile: 76 },
    { band: 6.0, percentile: 68 },
    { band: 5.5, percentile: 58 },
    { band: 5.0, percentile: 48 },
    { band: 4.5, percentile: 38 },
    { band: 4.0, percentile: 28 },
    { band: 3.5, percentile: 20 },
    { band: 3.0, percentile: 14 },
    { band: 2.5, percentile: 9 },
    { band: 2.0, percentile: 5 },
    { band: 1.5, percentile: 3 },
    { band: 1.0, percentile: 1 },
  ] as const;

  const closest = lookup.reduce((best, item) =>
    Math.abs(item.band - band) < Math.abs(best.band - band) ? item : best
  );

  return `${closest.percentile}th`;
}

function ScoreCard({
  correctCount,
  totalQuestions,
  scorePercent,
}: {
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
}) {
  const progress = Math.min(100, Math.max(0, scorePercent));
  const scoreLabel = `${correctCount}/${totalQuestions}`;
  const scoreTheme = getScoreTheme(scorePercent);

  return (
    <Card
      className="overflow-hidden border-border/70"
      style={{
        backgroundImage: `linear-gradient(180deg, ${scoreTheme.cardTintStrong}, ${scoreTheme.cardTintSoft} 34%, transparent 100%)`,
      }}
    >
      <CardContent className="flex flex-col items-center gap-0.5 px-0 py-5 text-center">
        <div className="text-xl font-bold tracking-tight text-foreground">Your Score</div>
        <div className="relative mt-0.5 w-full max-w-[17.5rem]">
          <div
            className="pointer-events-none absolute inset-x-10 top-5 h-16 rounded-full blur-3xl"
            style={{ backgroundColor: scoreTheme.glowTint }}
          />
          <svg viewBox="0 0 240 148" className="relative z-10 w-full overflow-visible">
            <defs>
              <linearGradient id="scoreGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={scoreTheme.gradientStart} />
                <stop offset="55%" stopColor={scoreTheme.gradientMid} />
                <stop offset="100%" stopColor={scoreTheme.gradientEnd} />
              </linearGradient>
              <filter id="scoreGaugeGlow" x="-20%" y="-20%" width="140%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M42 118 A78 78 0 0 1 198 118"
              pathLength="100"
              fill="none"
              stroke="currentColor"
              strokeWidth="15"
              strokeLinecap="round"
              className="text-border/70"
            />
            <path
              d="M42 118 A78 78 0 0 1 198 118"
              pathLength="100"
              fill="none"
              stroke="url(#scoreGaugeGradient)"
              strokeWidth="15"
              strokeLinecap="round"
              strokeDasharray={`${progress} 100`}
              filter="url(#scoreGaugeGlow)"
            >
              <animate attributeName="stroke-dasharray" from={`0 100`} to={`${progress} 100`} dur="1.2s" fill="freeze" />
            </path>
            <g className="text-muted-foreground">
              <text x="42" y="136" fontSize="12" textAnchor="middle" fill="currentColor">0</text>
              <text x="198" y="136" fontSize="12" textAnchor="middle" fill="currentColor">100</text>
            </g>
            <g opacity="0">
              <animate attributeName="opacity" from="0" to="1" begin="0.95s" dur="0.32s" fill="freeze" />
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 8"
                to="0 0"
                begin="0.95s"
                dur="0.32s"
                fill="freeze"
              />
              <text
                x="120"
                y="94"
                fontSize="26"
                fontWeight="700"
                textAnchor="middle"
                fill="currentColor"
                className="text-foreground"
              >
                {scoreLabel}
              </text>
              <text
                x="120"
                y="118"
                fontSize="13"
                fontWeight="600"
                letterSpacing="0.2em"
                textAnchor="middle"
                fill="currentColor"
                className="text-muted-foreground"
              >
                {scorePercent}%
              </text>
            </g>
          </svg>
        </div>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-left transition-colors"
          style={{
            borderColor: scoreTheme.borderTint,
            backgroundColor: scoreTheme.activeBg,
            color: scoreTheme.textColor,
          }}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: scoreTheme.dotColor, boxShadow: `0 0 0 4px ${scoreTheme.ringGlow}` }}
          />
          <span className="text-[11px] font-bold leading-tight tracking-[0.04em]">{scoreTheme.label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function getScoreTheme(scorePercent: number) {
  const themes = [
    {
      label: "Needs Improvement",
      min: 0,
      max: 39,
      gradientStart: "rgb(244 63 94)",
      gradientMid: "rgb(249 115 22)",
      gradientEnd: "rgb(251 191 36)",
      cardTintStrong: "rgba(244,63,94,0.14)",
      cardTintSoft: "rgba(244,63,94,0.03)",
      glowTint: "rgba(244,63,94,0.18)",
      borderTint: "rgba(244,63,94,0.22)",
      dotColor: "rgb(244 63 94)",
      activeBg: "rgba(244,63,94,0.12)",
      textColor: "rgb(159 18 57)",
      ringGlow: "rgba(244,63,94,0.16)",
    },
    {
      label: "Developing",
      min: 40,
      max: 59,
      gradientStart: "rgb(245 158 11)",
      gradientMid: "rgb(249 115 22)",
      gradientEnd: "rgb(251 191 36)",
      cardTintStrong: "rgba(245,158,11,0.14)",
      cardTintSoft: "rgba(245,158,11,0.03)",
      glowTint: "rgba(245,158,11,0.18)",
      borderTint: "rgba(245,158,11,0.22)",
      dotColor: "rgb(245 158 11)",
      activeBg: "rgba(245,158,11,0.12)",
      textColor: "rgb(146 64 14)",
      ringGlow: "rgba(245,158,11,0.16)",
    },
    {
      label: "Strong",
      min: 60,
      max: 79,
      gradientStart: "rgb(59 130 246)",
      gradientMid: "rgb(99 102 241)",
      gradientEnd: "rgb(14 165 233)",
      cardTintStrong: "rgba(59,130,246,0.14)",
      cardTintSoft: "rgba(59,130,246,0.03)",
      glowTint: "rgba(59,130,246,0.18)",
      borderTint: "rgba(59,130,246,0.22)",
      dotColor: "rgb(59 130 246)",
      activeBg: "rgba(59,130,246,0.12)",
      textColor: "rgb(30 64 175)",
      ringGlow: "rgba(59,130,246,0.16)",
    },
    {
      label: "Excellent",
      min: 80,
      max: 100,
      gradientStart: "rgb(16 185 129)",
      gradientMid: "rgb(6 182 212)",
      gradientEnd: "rgb(14 165 233)",
      cardTintStrong: "rgba(16,185,129,0.14)",
      cardTintSoft: "rgba(16,185,129,0.03)",
      glowTint: "rgba(16,185,129,0.18)",
      borderTint: "rgba(16,185,129,0.22)",
      dotColor: "rgb(16 185 129)",
      activeBg: "rgba(16,185,129,0.12)",
      textColor: "rgb(6 95 70)",
      ringGlow: "rgba(16,185,129,0.16)",
    },
  ] as const;
  return themes.find((theme) => scorePercent >= theme.min && scorePercent <= theme.max) ?? themes[0];
}

function PerformanceOverviewCard({
  correctCount,
  incorrectCount,
  notAnsweredCount,
  timeTaken,
  estimatedScore,
  percentile,
  leaderboardRank,
}: {
  correctCount: number;
  incorrectCount: number;
  notAnsweredCount: number;
  timeTaken: string;
  estimatedScore: string;
  percentile: string;
  leaderboardRank: number | null;
}) {
  const items = [
    {
      label: "Correct",
      value: String(correctCount),
      icon: CheckCircle2,
      tone: "text-emerald-500",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      shadow: "shadow-[0_10px_28px_-14px_rgba(16,185,129,0.7)]",
    },
    {
      label: "Incorrect",
      value: String(incorrectCount),
      icon: XCircle,
      tone: "text-rose-500",
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      shadow: "shadow-[0_10px_28px_-14px_rgba(244,63,94,0.7)]",
    },
    {
      label: "Not Answered",
      value: String(notAnsweredCount),
      icon: Minus,
      tone: "text-slate-400 dark:text-slate-300",
      bg: "bg-slate-400/10 dark:bg-slate-300/10",
      shadow: "shadow-[0_10px_28px_-14px_rgba(148,163,184,0.55)]",
    },
    {
      label: "Time Taken",
      value: timeTaken,
      icon: Clock3,
      tone: "text-sky-500",
      bg: "bg-sky-500/10 dark:bg-sky-500/15",
      shadow: "shadow-[0_10px_28px_-14px_rgba(14,165,233,0.7)]",
    },
  ] as const;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="text-xl font-bold tracking-tight text-foreground">
          Performance Overview
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl bg-muted/20 px-4 py-4 text-center">
                <div className="flex flex-col items-center">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.bg} ${item.shadow}`}>
                    <Icon className={`h-5.5 w-5.5 ${item.tone}`} />
                  </div>
                  <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{item.value}</p>
                  <p className="mt-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.06] px-4 py-3 text-center shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Estimated Score
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{estimatedScore}</p>
          </div>
          <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.06] px-4 py-3 text-center shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Percentile
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{percentile}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] px-4 py-3 text-center shadow-sm">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span>Leaderboard</span>
              <Link
                href="/leaderboard"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/20 bg-background/70 text-foreground transition-colors hover:bg-background"
                aria-label="Open full leaderboard"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {leaderboardRank ? `#${leaderboardRank}` : "Hidden"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeTaken(value: number): string {
  const totalSeconds = Math.max(0, value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
}

function BreakdownCard({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; correct: number; total: number }>;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div key={item.label} className="rounded-xl border border-border/80 bg-muted/[0.16] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{formatQuestionFamilyLabel(item.label)}</p>
                  <Badge tone={item.correct === item.total ? "success" : item.correct > 0 ? "warning" : "danger"}>
                    {item.correct}/{item.total}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Breakdown will appear once the backend has finished scoring.</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatQuestionFamilyLabel(value: string): string {
  return value
    .replace(/^(reading|listening)_/i, "")
    .split("_")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "mc") {
        return "MC";
      }
      if (lower === "tfng") {
        return "TFNG";
      }
      if (lower === "ynng") {
        return "YNNG";
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function getProgressTheme(progress: number) {
  if (progress >= 80) {
    return {
      bar: "rgb(16 185 129)",
      border: "rgba(16,185,129,0.26)",
      cardBg: "rgba(16,185,129,0.06)",
    };
  }
  if (progress >= 60) {
    return {
      bar: "rgb(59 130 246)",
      border: "rgba(59,130,246,0.24)",
      cardBg: "rgba(59,130,246,0.06)",
    };
  }
  if (progress >= 40) {
    return {
      bar: "rgb(245 158 11)",
      border: "rgba(245,158,11,0.24)",
      cardBg: "rgba(245,158,11,0.06)",
    };
  }
  return {
    bar: "rgb(244 63 94)",
    border: "rgba(244,63,94,0.24)",
    cardBg: "rgba(244,63,94,0.06)",
  };
}

function SectionBreakdownCard({
  items,
  testType,
}: {
  items: Array<{ label: string; correct: number; total: number }>;
  testType: string;
}) {
  const sectionPrefix = testType === "listening" ? "Part" : "Passage";

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-1.5">
        <CardTitle>Section breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length > 0 ? (
          <div className="grid gap-1.5 xl:grid-cols-3">
            {items.map((item, index) => {
              const progress = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
              const progressTheme = getProgressTheme(progress);
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="rounded-2xl border p-2"
                  style={{
                    borderColor: progressTheme.border,
                    backgroundColor: progressTheme.cardBg,
                  }}
                >
                  <div className="space-y-0.5">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold tracking-tight text-foreground">
                        {sectionPrefix} {index + 1}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, backgroundColor: progressTheme.bar }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                        <span>{item.correct}/{item.total} correct</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Breakdown will appear once the backend has finished scoring.</p>
        )}
      </CardContent>
    </Card>
  );
}
