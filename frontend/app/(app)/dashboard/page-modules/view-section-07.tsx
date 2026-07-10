import type { DashboardPageData } from "./loader";
import { ArrowRight, Badge, Button, Card, CardContent, Link, Play, StudyTimeCard, Target } from "./dependencies";

export function DashboardPageSection7({ scope }: { scope: DashboardPageData }) {
  const { inProgressTest, recTitle, recDesc, recHref, recBtnText, analytics } = scope;
  return (
    <div className="space-y-3">
              <div className="grid gap-4 xl:grid-cols-[580px_minmax(0,1fr)] xl:items-stretch">
                {inProgressTest ? (
                  <Card className="group relative min-h-[176px] w-full max-w-[580px] overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 shadow-md shadow-sky-950/8 transition-shadow hover:shadow-lg hover:shadow-sky-950/12 dark:border-sky-500/20 dark:bg-slate-950">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(219,234,254,0.5)_45%,rgba(186,230,253,0.42))] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(8,47,73,0.7))]" />
                    <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-sky-300/18 dark:bg-sky-500/10" />
                    <CardContent className="relative z-10 flex h-full flex-col justify-between gap-3 p-3 md:p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <Badge variant="outline" className="mb-2 rounded-full border-sky-300/70 bg-white/75 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-700 shadow-sm dark:border-sky-400/25 dark:bg-white/10 dark:text-sky-200">
                            IN PROGRESS
                          </Badge>
                          <div className="max-w-xl">
                            <h2 className="line-clamp-1 text-lg font-semibold leading-tight tracking-tight text-sky-950 dark:text-white">
                              {inProgressTest.title}
                            </h2>
                            <p className="mt-1 text-[13px] font-medium text-sky-800/75 dark:text-sky-100/70">
                              {inProgressTest.detailLabel}
                            </p>
                          </div>
                        </div>
    
                        <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/65 shadow-inner shadow-sky-900/10 dark:bg-white/10">
                          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                            <circle cx="56" cy="56" r="44" fill="none" stroke="rgba(14,165,233,0.16)" strokeWidth="10" />
                            <circle
                              cx="56"
                              cy="56"
                              r="44"
                              fill="none"
                              stroke="url(#in-progress-test-progress)"
                              strokeLinecap="round"
                              strokeWidth="10"
                              strokeDasharray={276.46}
                              strokeDashoffset={276.46 - (276.46 * inProgressTest.progressPercent) / 100}
                              className="transition-[stroke-dashoffset] duration-300"
                            />
                            <defs>
                              <linearGradient id="in-progress-test-progress" x1="20" x2="96" y1="20" y2="96" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#38BDF8" />
                                <stop offset="0.55" stopColor="#2563EB" />
                                <stop offset="1" stopColor="#0EA5E9" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="text-center">
                            <p className="text-2xl font-semibold leading-none tracking-tight text-sky-950 dark:text-white">
                              {inProgressTest.progressPercent}%
                            </p>
                            <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-sky-700/65 dark:text-sky-100/55">
                              Progress
                            </p>
                          </div>
                        </div>
                      </div>
    
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-xl bg-white/72 px-3 py-2 shadow-sm shadow-sky-950/5 dark:bg-white/[0.07]">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-700/65 dark:text-sky-100/55">Answers</p>
                          <p className="mt-0.5 text-base font-semibold tracking-tight text-sky-950 dark:text-white">{inProgressTest.answeredLabel}</p>
                        </div>
                        <div className="rounded-xl bg-white/72 px-3 py-2 shadow-sm shadow-sky-950/5 dark:bg-white/[0.07]">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-700/65 dark:text-sky-100/55">Time spent</p>
                          <p className="mt-0.5 text-base font-semibold tracking-tight text-sky-950 dark:text-white">{inProgressTest.timeSpentLabel}</p>
                        </div>
                        <div className="rounded-xl bg-white/72 px-3 py-2 shadow-sm shadow-sky-950/5 dark:bg-white/[0.07]">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-700/65 dark:text-sky-100/55">Estimated finish</p>
                          <p className="mt-0.5 text-base font-semibold tracking-tight text-sky-950 dark:text-white">{inProgressTest.estimatedFinishLabel}</p>
                        </div>
                      </div>
    
                      <Button
                        asChild
                        className="h-9 w-full rounded-xl bg-sky-600 text-[13px] font-semibold text-white shadow-md shadow-sky-700/20 transition-colors hover:bg-sky-700 active:scale-[0.99] dark:bg-sky-500 dark:hover:bg-sky-400"
                      >
                        <Link href={`/exam-preview/${inProgressTest.type}?attemptId=${inProgressTest.attemptId}&mode=${inProgressTest.mode}&resume=${Date.now()}`}>
                          Continue Test <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="relative min-h-[228px] overflow-hidden bg-blue-50 dark:bg-slate-950 border border-blue-100 dark:border-border/50 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-80" />
                    <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                      <Target className="w-32 h-32 -rotate-12 text-blue-900 dark:text-white" />
                    </div>
                    <CardContent className="flex h-full flex-col justify-between p-4 md:p-5 relative z-10">
                      <div>
                        <Badge variant="outline" className="bg-blue-100/50 dark:bg-white/10 text-blue-800 dark:text-white border-blue-200 dark:border-white/20 mb-2 font-bold tracking-wider uppercase text-[9px]">
                          Recommended For You
                        </Badge>
                        <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-1.5 text-blue-950 dark:text-white">{recTitle}</h2>
                        <p className="text-blue-800/80 dark:text-white/70 font-medium mb-4 text-xs max-w-md">
                          {recDesc}
                        </p>
                      </div>
    
                      <div className="flex justify-start pt-2">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-9 rounded-lg text-xs shadow-lg shadow-primary/20 transition-transform active:scale-95" asChild>
                          <Link href={recHref}>
                            <Play className="mr-1.5 h-4 w-4 fill-current" /> {recBtnText}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
    
                <StudyTimeCard analytics={analytics} className="h-full min-h-[176px]" />
              </div>
    
            </div>
  );
}
