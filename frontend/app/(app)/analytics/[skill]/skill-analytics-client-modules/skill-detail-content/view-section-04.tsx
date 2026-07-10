"use client";
import type { SkillDetailContentScope } from "./controller";
import { AlertTriangle, CartesianGrid, CheckCircle2, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "../dependencies";
import { AccuracyBar, Card, CardTitle, formatBand, formatTrendValue, noDataMessage } from "../shared";

export function SkillDetailContentSection4({ scope }: { scope: SkillDetailContentScope }) {
  const { strengthItems, weakItems, performanceTrend } = scope;
  return (
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
  );
}
