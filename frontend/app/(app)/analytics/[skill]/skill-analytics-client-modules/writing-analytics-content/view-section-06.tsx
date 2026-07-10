"use client";
import type { WritingAnalyticsContentScope } from "./controller";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, cn } from "../dependencies";
import { AccuracyBar, Card, CardTitle, formatBand, formatTrendValue } from "../shared";

export function WritingAnalyticsContentSection6({ scope }: { scope: WritingAnalyticsContentScope }) {
  const { setActiveDescriptorTab, activeDescriptorTab, activeDescriptors, writingPerformanceTrend } = scope;
  return (
    <div className="grid gap-4 lg:grid-cols-[0.38fr_0.62fr]">
              <Card className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle>Band Descriptors Overview</CardTitle>
                  <div className="flex gap-4 border-b border-slate-100">
                    {([
                      ["task1", "Task 1"],
                      ["task2", "Task 2"],
                    ] as const).map(([tab, label]) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveDescriptorTab(tab)}
                        className={cn(
                          "border-b-2 pb-2 text-sm font-bold transition",
                          activeDescriptorTab === tab ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-700",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-5 space-y-5">
    	              {activeDescriptors.map((item) => (
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
                <CardTitle>Performance Trend</CardTitle>
                <div className="mt-4 h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
    	                <LineChart data={writingPerformanceTrend} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EEF2F7" />
                      <XAxis dataKey="date" padding={{ left: 30, right: 30 }} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="band" domain={[1, 9]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9]} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={formatTrendValue} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }} />
                      <Line yAxisId="band" type="monotone" dataKey="band" name="Overall Band" stroke="#7C3AED" strokeWidth={2.8} dot={{ r: 3.5, fill: "#7C3AED", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line yAxisId="percent" type="monotone" dataKey="task" name="Task Achievement (%)" stroke="#10B981" strokeWidth={2.8} dot={{ r: 3.5, fill: "#10B981", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line yAxisId="percent" type="monotone" dataKey="lexical" name="Lexical Resource (%)" stroke="#2563EB" strokeWidth={2.8} dot={{ r: 3.5, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line yAxisId="percent" type="monotone" dataKey="grammar" name="Grammar Score (%)" stroke="#F97316" strokeWidth={2.8} dot={{ r: 3.5, fill: "#F97316", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-5 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-violet-600" />Overall Band</span>
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-emerald-500" />Task Achievement (%)</span>
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-blue-600" />Lexical Resource (%)</span>
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-orange-500" />Grammar Score (%)</span>
                </div>
              </Card>
            </div>
  );
}
