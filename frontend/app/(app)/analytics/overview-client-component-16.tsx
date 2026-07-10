"use client";

import { ArrowRight, BookOpenText, CalendarCheck, Card, CardContent, CartesianGrid, Clock3, ComponentType, Headphones, Legend, Line, LineChart, Link, Mic, PencilLine, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Target, Tooltip, XAxis, YAxis, Zap, cn, getSubscriptionPageHref, useAuthStore } from "./overview-client-dependencies";
import { SkillKey } from "./overview-client-component-01";
import { Props } from "./overview-client-component-02";
import { formatHours } from "./overview-client-component-03";
import { average } from "./overview-client-component-04";
import { roundWholeBand } from "./overview-client-component-05";
import { formatBand } from "./overview-client-component-06";
import { formatPercent } from "./overview-client-component-07";
import { buildTenDayBandTrend } from "./overview-client-component-10";
import { skillBand } from "./overview-client-component-11";
import { skillAccuracy } from "./overview-client-component-12";
import { skillStatus } from "./overview-client-component-13";
import { SectionHeader } from "./overview-client-component-14";
import { AnalyticsPremiumGate } from "./overview-client-component-15";

export function AnalyticsOverviewClient({ overall, reading, listening, writing, speaking, attempts, xpSummary }: Props) {
  const { isPremium, isAuthenticated } = useAuthStore();
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);

  if (!isPremium) {
    return <AnalyticsPremiumGate subscriptionHref={subscriptionHref} />;
  }

  const readingBand = skillBand(reading, "reading");
  const listeningBand = skillBand(listening, "listening");
  const writingBand = skillBand(writing, "writing");
  const speakingBand = skillBand(speaking, "speaking");
  const overallBand = roundWholeBand(average([readingBand, listeningBand, writingBand, speakingBand].filter((value): value is number => value !== null)));
  const averageAccuracy = average([skillAccuracy(reading), skillAccuracy(listening)].filter((value): value is number => value !== null));
  const studyTimeSeconds = overall.performanceSummary.studyTime.totalTimeSec;
  const trendData = buildTenDayBandTrend(overall.progressSeries);
  const skills: Array<{
    key: SkillKey;
    title: string;
    score: number | null;
    accuracy: number | null;
    attempts: number;
    icon: ComponentType<{ className?: string }>;
    color: string;
    iconBoxClassName: string;
    buttonClassName: string;
  }> = [
    {
      key: "reading",
      title: "Reading",
      score: readingBand,
      accuracy: skillAccuracy(reading),
      attempts: reading.performanceSummary.reading.fullCount + reading.performanceSummary.reading.section1Count + reading.performanceSummary.reading.section2Count + reading.performanceSummary.reading.section3Count,
      icon: BookOpenText,
      color: "#2563EB",
      iconBoxClassName: "border-blue-100 bg-blue-50 text-blue-600",
      buttonClassName: "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
    },
    {
      key: "listening",
      title: "Listening",
      score: listeningBand,
      accuracy: skillAccuracy(listening),
      attempts: listening.performanceSummary.listening.fullCount + listening.performanceSummary.listening.section1Count + listening.performanceSummary.listening.section2Count + listening.performanceSummary.listening.section3Count + listening.performanceSummary.listening.section4Count,
      icon: Headphones,
      color: "#10B981",
      iconBoxClassName: "border-emerald-100 bg-emerald-50 text-emerald-600",
      buttonClassName: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
    {
      key: "writing",
      title: "Writing",
      score: writingBand,
      accuracy: null,
      attempts: writing.performanceSummary.writing ? writing.performanceSummary.writing.section1Count + writing.performanceSummary.writing.section2Count + writing.performanceSummary.writing.fullCount : 0,
      icon: PencilLine,
      color: "#7C3AED",
      iconBoxClassName: "border-violet-100 bg-violet-50 text-violet-600",
      buttonClassName: "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100",
    },
    {
      key: "speaking",
      title: "Speaking",
      score: speakingBand,
      accuracy: null,
      attempts: (speaking.performanceSummary.speaking?.fullCount ?? 0)
        + (speaking.performanceSummary.speaking?.section1Count ?? 0)
        + (speaking.performanceSummary.speaking?.section2Count ?? 0)
        + (speaking.performanceSummary.speaking?.section3Count ?? 0)
        + (speaking.performanceSummary.speaking?.section4Count ?? 0),
      icon: Mic,
      color: "#F97316",
      iconBoxClassName: "border-orange-100 bg-orange-50 text-orange-600",
      buttonClassName: "border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100",
    },
  ];
  const radarData = skills.map((skill) => ({ skill: skill.title, you: skill.score ?? 0 }));
  const recentActivities = attempts.slice(0, 5);

  return (
    <div className="analytics-night analytics-overview -mx-1 space-y-5 bg-[#F8FAFC] pb-10 text-slate-950 sm:mx-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Analytics Overview</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 md:text-base">
          Track your real performance and improvement across IELTS skills.
        </p>
      </div>

      <Card className="overflow-hidden rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.42)]">
        <CardContent className="grid gap-0 p-0 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Overall Band", value: formatBand(overallBand), detail: "Recent average", icon: Target, iconClassName: "bg-violet-50 text-violet-600" },
            { label: "Total XP", value: `${xpSummary.totalXp.toLocaleString()} XP`, detail: `Level ${xpSummary.level}`, icon: Zap, iconClassName: "bg-orange-50 text-orange-500" },
            { label: "Tests Completed", value: String(attempts.length), detail: "Submitted attempts", icon: CalendarCheck, iconClassName: "bg-emerald-50 text-emerald-500" },
            { label: "Study Time", value: formatHours(studyTimeSeconds), detail: "Recorded attempt time", icon: Clock3, iconClassName: "bg-purple-50 text-purple-600" },
            { label: "Average Accuracy", value: formatPercent(averageAccuracy), detail: "Reading and Listening", icon: Target, iconClassName: "bg-orange-50 text-orange-500" },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className={cn("relative min-h-[150px] p-5", index > 0 && "border-t border-slate-100 sm:border-l sm:border-t-0")}>
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", metric.iconClassName)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{metric.label}</p>
                </div>
                <div className="ml-[52px] mt-2 text-left">
                  <p className="text-2xl font-bold tracking-tight text-slate-950">{metric.value}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-400">{metric.detail}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-5">
            <SectionHeader title="Skills Performance" subtitle="Current performance from completed attempts" />
            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {skills.map((skill) => {
                const Icon = skill.icon;
                const status = skillStatus(skill.score);
                return (
                  <div key={skill.key} className="group flex h-full flex-col">
                    <div className="flex h-full min-h-[218px] flex-1 flex-col justify-between rounded-[1.1rem] border border-slate-100 bg-white p-3.5 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", skill.iconBoxClassName)}>
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <span className="text-[15px] font-bold text-slate-950">{skill.title}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold tracking-tight text-slate-950">{formatBand(skill.score)}</p>
                            <span className={cn("rounded-full border px-2 py-1 text-[10px] font-bold", status.className)}>{status.label}</span>
                          </div>
                          <p className="mt-1 text-xs font-bold text-slate-500">From saved results</p>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Accuracy</p>
                            <p className="mt-1 text-sm font-bold text-slate-950">{formatPercent(skill.accuracy)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Attempts</p>
                            <p className="mt-1 text-sm font-bold text-slate-950">{skill.attempts}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Link href={`/analytics/${skill.key}`} className={cn("mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition", skill.buttonClassName)}>
                      View Analytics <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-0">
            <div className="p-5 pb-0">
              <SectionHeader title="Skill Comparison" subtitle="Average band score" />
            </div>
            <div className="mt-4 h-[306px] w-full overflow-visible px-[5px] pb-5">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%" margin={{ top: 12, right: 14, bottom: 12, left: 14 }}>
                  <PolarGrid gridType="polygon" stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "#64748B", fontSize: 12, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 9]} tick={false} axisLine={false} />
                  <Radar name="You" dataKey="you" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.18} strokeWidth={3} />
                  <Tooltip formatter={(value) => [formatBand(Number(value)), "Band"]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 14, boxShadow: "0 16px 36px rgba(15,23,42,0.12)" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-5">
            <SectionHeader title="Band Score Trend" />
            <div className="mt-4 h-[286px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: 2, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="date" padding={{ left: 28, right: 10 }} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 9]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9]} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value, name) => [formatBand(Number(value)), String(name)]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 14, boxShadow: "0 16px 36px rgba(15,23,42,0.12)" }} />
                  <Legend />
                  <Line type="monotone" dataKey="overall" name="Overall" stroke="#111827" strokeWidth={3} dot={{ r: 3, fill: "#111827", strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="reading" name="Reading" stroke="#2563EB" strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="listening" name="Listening" stroke="#059669" strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="writing" name="Writing" stroke="#7C3AED" strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="speaking" name="Speaking" stroke="#F97316" strokeWidth={2.6} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader title="Recent Activity" />
              <Link href="/history" className="text-sm font-bold text-violet-600 hover:text-violet-700">View all</Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {recentActivities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">No completed attempts yet.</div>
              ) : recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{activity.testTitle}</p>
                    <p className="text-xs font-semibold text-slate-500">{activity.type} · Band {formatBand(activity.band)}</p>
                  </div>
                  <p className="shrink-0 text-[11px] font-semibold text-slate-400">{activity.lastSavedAt}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
