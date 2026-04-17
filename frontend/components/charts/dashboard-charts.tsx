"use client";

import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui/card";

interface DashboardChartsProps {
  progressSeries: Array<{ name: string; reading: number; listening: number }>;
  radarSeries: Array<{ subject: string; value: number }>;
  heatmap: Array<{ month: string; value: number }>;
}

export function DashboardCharts({ progressSeries, radarSeries, heatmap }: DashboardChartsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <Card className="p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Band score progress</p>
          <h3 className="mt-1  text-xl font-semibold">Reading and Listening trend</h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressSeries}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 9]} tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reading" stroke="#2563eb" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="listening" stroke="#0f766e" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Skill breakdown</p>
          <h3 className="mt-1  text-xl font-semibold">Question-type radar</h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarSeries}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="xl:col-span-2 p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Activity heatmap</p>
          <h3 className="mt-1  text-xl font-semibold">Last 12 months</h3>
        </div>
        <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 lg:grid-cols-12">
          {heatmap.map((entry) => (
            <div key={`${entry.month}-${entry.value}`} className="space-y-2">
              <div
                className="h-10 rounded-xl border border-border/60"
                style={{
                  background:
                    entry.value === 0
                      ? "rgba(148, 163, 184, 0.12)"
                      : entry.value === 1
                        ? "rgba(37, 99, 235, 0.12)"
                        : entry.value === 2
                          ? "rgba(37, 99, 235, 0.22)"
                          : entry.value === 3
                            ? "rgba(37, 99, 235, 0.32)"
                            : "rgba(37, 99, 235, 0.46)"
                }}
              />
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{entry.month}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
