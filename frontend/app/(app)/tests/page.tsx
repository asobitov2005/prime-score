import Link from "next/link";
import { BookOpen, Headphones, Eye, CheckCircle2, X, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StartTestModal } from "@/components/start-test-modal";
import { getCatalogTests } from "@/lib/server-data";
import { getUserAttempts } from "@/lib/server-me";
import { SearchInput } from "./search-input";
import { SmartFilterShell } from "./smart-filter-shell";
import { TestsRefreshOnMount } from "./refresh-on-mount";
import { getTestSourceLabel } from "@/lib/test-source";
import { cn } from "@/lib/utils";
import type { AttemptRow, TestCardAttemptSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TestsPageProps {
  searchParams?: {
    type?: string;
    access?: string;
    format?: string;
    source?: string;
    q?: string;
  };
}

function isCompletedAttempt(attempt: TestCardAttemptSummary) {
  return attempt.status === "completed" || attempt.status === "submitted";
}

function toCardAttemptSummary(attempt: AttemptRow): TestCardAttemptSummary {
  return {
    id: attempt.id,
    mode: attempt.mode,
    status: attempt.status,
    score: attempt.score,
    band: attempt.band,
    totalQuestions: attempt.totalQuestions,
    lastSavedAt: attempt.lastSavedAt,
  };
}

function formatCompletedScore(
  attempt: TestCardAttemptSummary | undefined,
  fallbackTotalQuestions: number,
  isFullTest: boolean
) {
  if (!attempt || attempt.score === "Pending") {
    return null;
  }

  const totalQuestions = attempt.totalQuestions && attempt.totalQuestions > 0 ? attempt.totalQuestions : fallbackTotalQuestions;
  const correctLabel = attempt.score.includes("/")
    ? `${attempt.score} correct`
    : `${attempt.score}/${totalQuestions} correct`;
  const bandLabel = isFullTest && attempt.band ? ` • Band ${attempt.band}` : "";
  return `${correctLabel}${bandLabel}`;
}

function isCambridgeTest(source: string, sourceDetail: string) {
  const normalizedSource = source.trim().toLowerCase();
  const normalizedDetail = sourceDetail.trim().toLowerCase();
  return normalizedSource.includes("cambridge") || normalizedDetail.includes("cambridge");
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const activeType = searchParams?.type || "reading";
  const activeFormat = searchParams?.format || "all";
  const activeSource = searchParams?.source || "";
  const searchQuery = searchParams?.q?.toLowerCase() || "";
  const rawQuery = searchParams?.q || "";

  const [rawTests, userAttempts] = await Promise.all([
    getCatalogTests({ 
      type: activeType, 
      format: activeFormat === "all" ? undefined : activeFormat,
      source: activeSource
    }),
    getUserAttempts()
  ]);

  const testsById = new Map(rawTests.map((test) => [test.id, test]));
  const tests = Array.from(testsById.values()).filter(test => {
    if (test.status !== "published") return false;
    if (!searchQuery) return true;
    return test.title.toLowerCase().includes(searchQuery) || test.sourceDetail.toLowerCase().includes(searchQuery);
  });
  const latestAttemptByTestId = new Map<string, TestCardAttemptSummary>();

  for (const attempt of userAttempts) {
    if (!latestAttemptByTestId.has(attempt.testId)) {
      latestAttemptByTestId.set(attempt.testId, toCardAttemptSummary(attempt));
    }
  }

  const attemptCountByTestId = userAttempts.reduce<Record<string, number>>((acc, a) => {
    acc[a.testId] = (acc[a.testId] ?? 0) + 1;
    return acc;
  }, {});

  const hasFormatFilter = activeFormat !== "all";

  const formatDisplay = (testFormat: string) => {
    if (!testFormat || testFormat === "full") return "Full Test";
    return testFormat.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formats = activeType === "reading" 
    ? [
        { id: "all", label: "All" },
        { id: "full", label: "Full Test" },
        { id: "passage_1", label: "Passage 1" },
        { id: "passage_2", label: "Passage 2" },
        { id: "passage_3", label: "Passage 3" },
      ]
    : [
        { id: "all", label: "All" },
        { id: "full", label: "Full Test" },
        { id: "part_1", label: "Part 1" },
        { id: "part_2", label: "Part 2" },
        { id: "part_3", label: "Part 3" },
        { id: "part_4", label: "Part 4" },
      ];

  const buildTestsHref = ({
    type = activeType,
    format = activeFormat,
    source = activeSource,
    q = rawQuery,
  }: {
    type?: string;
    format?: string;
    source?: string;
    q?: string;
  }) => {
    const params = new URLSearchParams();
    params.set("type", type);
    if (format && format !== "all") {
      params.set("format", format);
    }
    if (source) {
      params.set("source", source);
    }
    if (q) {
      params.set("q", q);
    }
    return `/tests?${params.toString()}`;
  };

  return (
    <div className="flex flex-col max-w-6xl mx-auto animate-in fade-in duration-500">
      <TestsRefreshOnMount />
      
      {/* Filters Container */}
      <SmartFilterShell className="sticky top-[var(--app-shell-sticky-top,5.5rem)] z-40">
        <div className="space-y-4 bg-background pb-4 pt-2">
          {/* Primary Filter (Reading / Listening) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border/50 shadow-inner w-full md:w-max">
              {[
                { id: "reading", label: "Reading", icon: BookOpen },
                { id: "listening", label: "Listening", icon: Headphones }
              ].map(type => {
                const Icon = type.icon;
                const isActive = activeType === type.id;
                return (
                  <Button
                    key={type.id}
                    asChild
                    variant="ghost"
                    className={cn(
                      "flex-1 md:w-36 h-10 rounded-xl font-semibold text-sm transition-all duration-300 gap-2",
                      isActive 
                        ? "bg-background text-foreground shadow-sm border border-border/50 scale-105 z-10" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Link href={buildTestsHref({ type: type.id, format: "all" })}>
                      <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "opacity-50")} />
                      {type.label}
                    </Link>
                  </Button>
                );
              })}
            </div>

            <div className="flex w-full justify-end md:ml-auto md:w-[24rem] md:max-w-[24rem]">
              <SearchInput activeType={activeType} />
            </div>
          </div>

          {/* Secondary Filter (Dynamic) */}
          <div className="flex flex-col gap-3 bg-card/40 border border-border/40 rounded-[2rem] p-1 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto custom-scrollbar py-1 px-1">
              {formats.map((f) => {
                const isActive = activeFormat === f.id;
                return (
                  <Button
                    key={f.id}
                    asChild
                    variant={isActive ? "solid" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 px-4 rounded-full font-bold text-xs whitespace-nowrap transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground dark:text-slate-950 shadow-lg shadow-primary/20 scale-105" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Link href={buildTestsHref({ format: f.id })}>
                      {f.label}
                    </Link>
                  </Button>
                );
              })}
            </div>

            <div className="flex w-full items-center justify-end gap-2 px-1 pb-1 sm:w-auto sm:pb-0">
              {hasFormatFilter && (
                <Button asChild variant="ghost" size="sm" className="h-10 px-4 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                  <Link href={buildTestsHref({ format: "all" })}>
                    <X className="h-3.5 w-3.5 mr-2" />
                    Clear
                  </Link>
                </Button>
              )}

              <div className="ml-1 inline-flex h-10 items-center rounded-full border border-border/45 bg-background/70 px-4 text-sm font-semibold text-muted-foreground/85 shadow-sm backdrop-blur-sm">
                {tests.length} tests
              </div>
            </div>
          </div>
        </div>
      </SmartFilterShell>

      {/* Test Grid area */}
      <div className="pt-4 pb-8 sm:pt-5">
        {tests.length === 0 ? (
          <EmptyState
            title="No tests matching your filters"
            action={{ href: "/tests", label: "Show all tests" }}
            className="bg-card/35 lg:h-[min(28rem,calc(100dvh-var(--app-shell-sticky-top,5rem)-15.75rem))]"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tests.map((test) => {
            const isFull = !test.format || test.format === "full";
            const latestAttempt = latestAttemptByTestId.get(test.id);
            const activeAttempt = latestAttempt?.status === "in_progress" ? latestAttempt : undefined;
            const completedAttempt = latestAttempt && isCompletedAttempt(latestAttempt) ? latestAttempt : undefined;
            const isCompleted = Boolean(completedAttempt);
            const isNew = test.createdAt ? (new Date().getTime() - new Date(test.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
            const completedScoreText = formatCompletedScore(completedAttempt, test.questionCount, isFull);
            const isExamPreviewTest = test.id === "reading-cam18-t1";
            const isCambridge = isCambridgeTest(test.source, test.sourceDetail);
            const detailHref = `/tests/${test.slug || test.id}`;

            return (
              <Card key={test.id} className="group relative overflow-hidden rounded-2xl border-primary/20 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300 flex flex-col shadow-sm">
                <Link href={detailHref} aria-label={`Open ${test.title}`} className="absolute inset-0 z-10" />
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/40" />
                {isNew && (
                  <div className="absolute left-0 top-0 z-30 h-[80px] w-[80px] overflow-hidden rounded-tl-2xl pointer-events-none select-none">
                    <svg width="80" height="80" viewBox="0 0 80 80" className="absolute left-0 top-0">
                      <defs>
                        <linearGradient id="ribbonGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#9e0c1b" />
                          <stop offset="35%" stopColor="#e62035" />
                          <stop offset="50%" stopColor="#ff4d6d" />
                          <stop offset="65%" stopColor="#e62035" />
                          <stop offset="100%" stopColor="#9e0c1b" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M 0 0 
                           L 0 62 
                           C 0 62, 2 62, 5 58 
                           C 12 48, 48 12, 58 5 
                           C 62 2, 62 0, 62 0 
                           Z" 
                        fill="url(#ribbonGrad)" 
                      />
                      <path d="M 0 62 C 0 62, 3 64, 5 62 L 0 56 Z" fill="#590007" />
                      <path d="M 62 0 C 62 0, 64 3, 62 5 L 56 0 Z" fill="#590007" />
                      <text 
                        x="22" 
                        y="29" 
                        transform="rotate(-45 22 29)" 
                        fill="#ffffff" 
                        fontFamily="system-ui, -apple-system, sans-serif" 
                        fontWeight="900" 
                        fontSize="10.5" 
                        letterSpacing="1.5" 
                        textAnchor="middle" 
                        filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.6))"
                      >
                        NEW
                      </text>
                    </svg>
                  </div>
                )}
                <CardHeader className="p-5 pb-2 flex-1 pt-8">
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex flex-wrap gap-2">
                        {isExamPreviewTest && (
                          <div className="bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 flex items-center gap-1">
                            <Eye className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Exam Preview</span>
                          </div>
                        )}
                        {test.accessType === "premium" && (
                          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Premium</span>
                          </div>
                        )}
                        
                        {isCompleted && (
                          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Completed</span>
                          </div>
                        )}
                     </div>
                     
                     <Badge variant="secondary" className={cn(
                        "font-semibold uppercase text-[9px] tracking-widest px-2.5 py-0.5",
                        isFull ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none" : "bg-muted text-muted-foreground border-none"
                      )}>
                        {isFull ? "Full Test" : formatDisplay(test.format)}
                      </Badge>
                   </div>
                   
                   <div className="space-y-2 mt-1">
                     {isCambridge ? (
                       <>
                         <CardTitle className="text-[15px] font-semibold leading-tight text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                           {test.title}
                         </CardTitle>
                         {completedScoreText ? (
                           <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                             {completedScoreText}
                           </p>
                         ) : null}
                       </>
                     ) : (
                       <>
                         <div className="flex items-start justify-between gap-3">
                           <CardTitle className="min-w-0 flex-1 text-[15px] font-semibold leading-tight text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                             {test.title}
                           </CardTitle>
                           {completedScoreText ? (
                             <p className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                               {completedScoreText}
                             </p>
                           ) : null}
                         </div>
                       </>
                     )}
                     {isExamPreviewTest ? (
                       <p className="text-xs font-medium text-primary/85">
                         Opens the new split-screen exam layout preview.
                       </p>
                     ) : null}
                     <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pt-1">
                       <span>{getTestSourceLabel(test.source)}</span>
                     </div>
                   </div>
                </CardHeader>

                <CardContent className="p-5 pt-2 shrink-0">
                   <div className="relative z-20 pt-3 border-t border-border/5">
                      <StartTestModal test={test} activeAttempt={activeAttempt} completedAttempt={completedAttempt} />
                   </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
