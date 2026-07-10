"use client";
import type { SkillDetailContentScope } from "./controller";
import { AlertTriangle, Area, AreaChart, ArrowLeft, CartesianGrid, CheckCircle2, Info, Line, LineChart, Link, ResponsiveContainer, Tooltip, XAxis, YAxis, cn } from "../dependencies";
import { AccuracyBar, Card, CardTitle, focusIcon, formatBand, formatTrendValue, noDataMessage, progressColor } from "../shared";

export function SkillDetailContentView1({ scope }: { scope: SkillDetailContentScope }) {
  const { isListening, HeaderIcon, pageTitle, pageSubtitle, averageBand, status, StatusIcon, overallChangeClassName, overallChangeLabel, bandTrend, primaryChartColor, metrics, strengthItems, weakItems, performanceTrend, questionTypeItems, analysisTitle, focusItems, priorityItems } = scope;
  return (
    (
        <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
          <main className="space-y-5">
            <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600">
              <ArrowLeft className="h-4 w-4 text-indigo-600" />
              Back to Analytics
            </Link>
    
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border",
                  isListening ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-blue-100 bg-blue-50 text-blue-600",
                )}>
                  <HeaderIcon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">{pageTitle}</h1>
                  <p className="mt-2 text-sm font-medium text-[#64748B] sm:text-base">
                    {pageSubtitle}
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
    	                  <p className="text-5xl font-semibold leading-none tracking-tight text-[#0F172A]">{formatBand(averageBand)}</p>
    	                  <span className={cn("mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", status.className)}>
    	                    <StatusIcon className="h-3.5 w-3.5" />
    	                    {status.label}
    	                  </span>
    	                </div>
    	                <p className="mt-2 text-sm font-semibold text-slate-500">
    	                  <span className={overallChangeClassName}>{overallChangeLabel}</span> from previous attempts
    	                </p>
                  </div>
    
                  <div className="h-[150px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={bandTrend} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="readingBandFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={primaryChartColor} stopOpacity={0.18} />
                            <stop offset="100%" stopColor={primaryChartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#EEF2F7" />
                        <XAxis dataKey="date" padding={{ left: 24, right: 8 }} tick={{ fill: "#64748B", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
    	                    <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => [formatBand(Number(value)), "Band"]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                        <Area type="monotone" dataKey="score" stroke={primaryChartColor} strokeWidth={2.6} fill="url(#readingBandFill)" dot={{ r: 3.5, fill: primaryChartColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
    
              <Card className="min-h-[190px] p-0">
                <div className="grid h-full sm:grid-cols-2 xl:grid-cols-4">
                  {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                      <div key={metric.label} className={cn("p-5", index > 0 && "border-t border-slate-100 sm:border-l sm:border-t-0")}>
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", metric.iconClassName)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0F172A]">{metric.value}</p>
                        <p className="mt-1 text-xs font-medium text-[#64748B]">{metric.subtext}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
    
            <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
              <Card className="p-5">
                <CardTitle>Section Breakdown</CardTitle>
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="rounded-2xl bg-emerald-50/70 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Strengths
                    </div>
                    <div className="space-y-4">
    	                  {strengthItems.length === 0 ? noDataMessage("Complete attempts to reveal strengths.") : strengthItems.map((item) => (
    	                    <div key={item.label}>
                          <div className="mb-2 text-sm">
                            <p className="font-semibold text-slate-800">{item.label}</p>
                            <p className="mt-0.5 text-xs font-bold text-emerald-700">{Math.round(item.accuracy)}% accuracy</p>
                          </div>
                          <AccuracyBar value={item.accuracy} />
                        </div>
    	                  ))}
                    </div>
                  </div>
    
                  <div className="rounded-2xl bg-red-50/65 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Weak Areas
                    </div>
                    <div className="space-y-4">
    	                  {weakItems.length === 0 ? noDataMessage("Complete attempts to reveal weak areas.") : weakItems.map((item) => (
    	                    <div key={item.label}>
                          <div className="mb-2 text-sm">
                            <p className="font-semibold text-slate-800">{item.label}</p>
                            <p className="mt-0.5 text-xs font-bold text-red-600">{Math.round(item.accuracy)}% accuracy</p>
                          </div>
                          <AccuracyBar value={item.accuracy} color="bg-red-500" />
                        </div>
    	                  ))}
                    </div>
                  </div>
                </div>
              </Card>
    
              <Card id="question-type-performance" className="scroll-mt-24 p-5">
                <CardTitle>Performance Trend</CardTitle>
                <div className="mt-4 h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceTrend} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EEF2F7" />
                      <XAxis dataKey="date" padding={{ left: 30, right: 30 }} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="band" domain={[0, 9]} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="accuracy" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={formatTrendValue} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }} />
                      <Line yAxisId="band" type="monotone" dataKey="band" name="Band Score" stroke="#4F46E5" strokeWidth={2.8} dot={{ r: 3.5, fill: "#4F46E5", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line yAxisId="accuracy" type="monotone" dataKey="accuracy" name="Accuracy (%)" stroke="#10B981" strokeWidth={2.8} dot={{ r: 3.5, fill: "#10B981", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex items-center justify-center gap-5 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-indigo-600" />Band Score</span>
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-emerald-500" />Accuracy (%)</span>
                </div>
              </Card>
            </div>
    
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
              <Card className="p-5">
                <CardTitle>Question Type Performance</CardTitle>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] gap-6 bg-slate-50 px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <span>Question Type</span>
                    <span>Accuracy</span>
                    <span className="text-right">Attempts</span>
                  </div>
                  <div className="divide-y divide-slate-100">
    	                {questionTypeItems.length === 0 ? (
                        <div className="p-5">{noDataMessage("No question type data yet.")}</div>
                      ) : questionTypeItems.map((item) => (
                      <div key={item.label} className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] items-center gap-6 px-5 py-5">
                        <p className="min-w-0 text-sm font-semibold text-slate-800">{item.label}</p>
                        <div className="flex w-full items-center gap-4 [&_.h-2]:h-2.5">
                          <span className="w-12 shrink-0 text-sm font-bold text-slate-900">{Math.round(item.accuracy)}%</span>
                          <div className="min-w-0 flex-1">
                            <AccuracyBar value={item.accuracy} color={progressColor(item.tone)} />
                          </div>
                        </div>
                        <p className="text-right text-sm font-bold text-slate-700">{item.attempts}</p>
                      </div>
    	                ))}
                  </div>
                </div>
              </Card>
    
              <div className="grid gap-4">
                <Card className="p-5">
                  <CardTitle>{analysisTitle}</CardTitle>
                  <div className="mt-4 divide-y divide-slate-100">
    	                {focusItems.length === 0 ? noDataMessage("No focus data yet.") : focusItems.map((item) => {
    	                  const Icon = focusIcon(item.key, Info);
    	                  return (
                        <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                              {item.subtext ? <p className="mt-0.5 text-xs font-medium text-[#64748B]">{item.subtext}</p> : null}
                            </div>
                          </div>
    	                      {item.status === "needs_work" ? (
    	                        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">{item.valueLabel}</span>
    	                      ) : (
    	                        <span className="shrink-0 text-sm font-bold text-slate-900">{item.valueLabel}</span>
    	                      )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
    
                <Card className="p-5">
                  <CardTitle>What to improve first</CardTitle>
                  <div className="mt-4 space-y-3">
    	                {priorityItems.length === 0 ? noDataMessage("Complete more attempts to build priorities.") : priorityItems.map((item) => (
                      <div key={item.number} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", item.badgeClassName)}>
                          {item.number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900">{item.title}</p>
                            <span className="text-xs font-bold text-red-500">{item.metric}</span>
                          </div>
                          <p className="mt-1 text-xs font-medium leading-5 text-[#64748B]">{item.focus}</p>
                        </div>
                      </div>
    	                ))}
                  </div>
                </Card>
              </div>
            </div>
          </main>
        </div>
      )
  );
}
