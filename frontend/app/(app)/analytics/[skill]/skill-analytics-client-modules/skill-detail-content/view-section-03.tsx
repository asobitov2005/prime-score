"use client";
import type { SkillDetailContentScope } from "./controller";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, cn } from "../dependencies";
import { Card, formatBand } from "../shared";

export function SkillDetailContentSection3({ scope }: { scope: SkillDetailContentScope }) {
  const { averageBand, status, StatusIcon, overallChangeClassName, overallChangeLabel, bandTrend, primaryChartColor, metrics } = scope;
  return (
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
  );
}
