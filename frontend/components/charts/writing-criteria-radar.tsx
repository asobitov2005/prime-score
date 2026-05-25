"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardWritingCriteria } from "@/lib/types";

interface WritingCriteriaRadarProps {
  criteria: DashboardWritingCriteria | null;
}

export function WritingCriteriaRadar({ criteria }: WritingCriteriaRadarProps) {
  if (!criteria) return null;

  // Map to the format recharts expects
  const data = [
    {
      subject: "Task Achievement",
      score: criteria.taskAchievement || 0,
      fullMark: 9,
    },
    {
      subject: "Coherence & Cohesion",
      score: criteria.coherenceCohesion || 0,
      fullMark: 9,
    },
    {
      subject: "Lexical Resource",
      score: criteria.lexicalResource || 0,
      fullMark: 9,
    },
    {
      subject: "Grammatical Range",
      score: criteria.grammaticalRangeAccuracy || 0,
      fullMark: 9,
    },
  ];

  return (
    <Card className="col-span-1 rounded-2xl border border-border/50 bg-card/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Writing Skills Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.7} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 9]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                  boxShadow: "0 20px 48px -24px rgba(15, 23, 42, 0.45)",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                  fontWeight: 700,
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                  fontWeight: 700,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
            <span>Average Band Score per Pillar</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
