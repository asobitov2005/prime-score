"use client";

import { AlertTriangle, Area, AreaChart, ArrowLeft, CartesianGrid, CheckCircle, CheckCircle2, ClipboardList, Clock3, DashboardAnalytics, FileText, Info, Link, MessageCircle, Mic, ResponsiveContainer, ScanSearch, Timer, Tooltip, Volume2, XAxis, YAxis, cn } from "./dependencies";

import { AccuracyBar, Card, CardTitle, IconComponent, average, buildSevenDayBandTrend, formatBand, roundWholeBand } from "./shared-part-01";



export function skillStatus(score: number | null) {
  if (score === null) return { label: "No data", className: "bg-slate-100 text-slate-500", icon: Info };
  if (score >= 6.5) return { label: "Strength", className: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 };
  if (score >= 5) return { label: "Improving", className: "bg-amber-50 text-amber-700", icon: CheckCircle2 };
  return { label: "Needs focus", className: "bg-red-50 text-red-600", icon: AlertTriangle };
}

export function questionTone(accuracy: number) {
  if (accuracy >= 70) return "green";
  if (accuracy >= 50) return "blue";
  if (accuracy >= 35) return "orange";
  return "red";
}

export function focusIcon(key: string, fallback: IconComponent): IconComponent {
  if (key === "weakest_section") return AlertTriangle;
  if (key === "best_section") return CheckCircle;
  if (key === "detail_recognition") return ScanSearch;
  if (key === "paraphrase_understanding") return FileText;
  if (key === "distractor_handling") return Volume2;
  if (key === "spelling_accuracy") return CheckCircle;
  if (key === "avg_time") return Clock3;
  if (key === "recommended_time") return Timer;
  if (key === "time_management") return AlertTriangle;
  if (key === "slowest_section") return Clock3;
  if (key === "fastest_section") return CheckCircle;
  if (key === "unanswered") return ClipboardList;
  return fallback;
}

export function noDataMessage(label: string) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-500">
      {label}
    </div>
  );
}

export function SpeakingAnalyticsContent({ analytics }: { analytics: DashboardAnalytics }) {
  const speakingBands = analytics.progressSeries
    .map((point) => point.speaking)
    .filter((value): value is number => typeof value === "number");
  const averageSpeakingBand = roundWholeBand(average(speakingBands.slice(-10)));
  const speakingTrend = buildSevenDayBandTrend(analytics.progressSeries, "speaking");
  const speakingCriteria = analytics.speakingCriteria;
  const completedCount = (analytics.performanceSummary.speaking?.fullCount ?? 0)
    + (analytics.performanceSummary.speaking?.section1Count ?? 0)
    + (analytics.performanceSummary.speaking?.section2Count ?? 0)
    + (analytics.performanceSummary.speaking?.section3Count ?? 0)
    + (analytics.performanceSummary.speaking?.section4Count ?? 0);
  const criteriaRows = [
    { label: "Fluency & Coherence", value: roundWholeBand(speakingCriteria?.fluency), color: "bg-emerald-500" },
    { label: "Lexical Resource", value: roundWholeBand(speakingCriteria?.lexicalResource), color: "bg-blue-500" },
    { label: "Grammar Range & Accuracy", value: roundWholeBand(speakingCriteria?.grammar), color: "bg-orange-500" },
    { label: "Pronunciation", value: roundWholeBand(speakingCriteria?.pronunciation), color: "bg-violet-500" },
  ];
  const status = skillStatus(averageSpeakingBand);
  const StatusIcon = status.icon;
  const priorityItems = criteriaRows
    .filter((item) => item.value !== null)
    .sort((a, b) => Number(a.value) - Number(b.value))
    .slice(0, 3)
    .map((item, index) => ({
      number: index + 1,
      title: item.label,
      metric: `Band ${formatBand(item.value)}`,
      focus: `Focus: improve ${item.label.toLowerCase()} in your next speaking session.`,
      badgeClassName: index === 0 ? "bg-red-50 text-red-600" : index === 1 ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-700",
    }));

  return (
    <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
      <main className="space-y-5">
        <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-600">
          <ArrowLeft className="h-4 w-4 text-violet-600" />
          Back to Analytics
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-violet-100 bg-violet-50 text-violet-600 shadow-sm">
              <Mic className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Speaking Analytics</h1>
              <p className="mt-2 text-sm font-medium text-[#64748B] sm:text-base">
                Track graded Speaking sessions, criterion bands, and recent movement.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <Card className="p-5">
            <div className="grid h-full gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Overall Band</p>
                <div className="mt-3">
                  <p className="text-5xl font-semibold leading-none tracking-tight text-[#0F172A]">{formatBand(averageSpeakingBand)}</p>
                  <span className={cn("mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", status.className)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">{completedCount} graded sessions</p>
              </div>

              <div className="h-[150px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={speakingTrend} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speakingBandFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="date" padding={{ left: 24, right: 8 }} tick={{ fill: "#64748B", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [formatBand(Number(value)), "Band"]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke="#F97316" strokeWidth={2.6} fill="url(#speakingBandFill)" dot={{ r: 3.5, fill: "#F97316", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="grid h-full sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Fluency", value: formatBand(speakingCriteria?.fluency), icon: MessageCircle, iconClassName: "bg-emerald-50 text-emerald-600" },
                { label: "Lexical", value: formatBand(speakingCriteria?.lexicalResource), icon: FileText, iconClassName: "bg-blue-50 text-blue-600" },
                { label: "Grammar", value: formatBand(speakingCriteria?.grammar), icon: CheckCircle2, iconClassName: "bg-orange-50 text-orange-600" },
                { label: "Pronunciation", value: formatBand(speakingCriteria?.pronunciation), icon: Volume2, iconClassName: "bg-violet-50 text-violet-600" },
              ].map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className={cn("p-5", index > 0 && "border-t border-slate-100 sm:border-l sm:border-t-0")}>
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", metric.iconClassName)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0F172A]">{metric.value}</p>
                    <p className="mt-1 text-xs font-medium text-[#64748B]">Average criterion band</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <Card className="p-5">
            <CardTitle>Criterion Breakdown</CardTitle>
            <div className="mt-5 space-y-5">
              {completedCount === 0 ? noDataMessage("Complete a graded Speaking session to build analytics.") : criteriaRows.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-sm font-bold text-slate-950">{formatBand(item.value)}</p>
                  </div>
                  <AccuracyBar value={item.value === null ? 0 : (item.value / 9) * 100} color={item.color} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>What to improve first</CardTitle>
            <div className="mt-4 space-y-3">
              {priorityItems.length === 0 ? noDataMessage("Complete graded Speaking sessions to build priorities.") : priorityItems.map((item) => (
                <div key={item.number} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", item.badgeClassName)}>
                    {item.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <span className="text-xs font-bold text-orange-600">{item.metric}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium leading-5 text-[#64748B]">{item.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
