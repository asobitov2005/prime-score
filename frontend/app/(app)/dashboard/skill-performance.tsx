"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Headphones, PenSquare, Mic } from "lucide-react";
import type { AttemptRow, DashboardAnalytics } from "@/lib/types";
import type { WritingHistoryItem } from "@/lib/server-writing";
import { getAverageBand } from "@/components/charts/use-dashboard-analytics";
import { cn } from "@/lib/utils";

interface SkillPerformanceProps {
  analytics: DashboardAnalytics;
  attempts: AttemptRow[];
  writingHistory: {
    items: WritingHistoryItem[];
    total: number;
  };
}

interface SkillCardData {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  iconBg: string;
  iconColor: string;
  score: string;
  badgeText: string;
  badgeClass: string;
  sparklineColor: string;
  sparklineGradientId: string;
  sparkPoints: number[];
  lastTestText: string;
  xpText: string;
  href: string;
}

// Check if a date string represents a timestamp within the last 7 days
function isWithinLast7Days(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const timeDiff = now.getTime() - date.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);
  return daysDiff >= 0 && daysDiff <= 7;
}

// Calculate the number of days ago for a given date
function getDaysAgoText(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Never";
  
  const now = new Date();
  // Clear times to compare days only
  now.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const timeDiff = now.getTime() - targetDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
  if (daysDiff < 0) return "Just now";
  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "1 day ago";
  return `${daysDiff} days ago`;
}

// Helper to generate a beautiful sparkline progress curve if data is minimal
function generateProgressSparkPoints(rawPoints: number[], defaultPoints: number[]): number[] {
  if (rawPoints.length === 0) {
    return defaultPoints;
  }
  const clean = rawPoints.filter(p => p > 0);
  if (clean.length === 0) {
    return defaultPoints;
  }
  
  // If we have less than 5 points, pad elegantly so it renders beautifully
  const lastVal = clean[clean.length - 1];
  if (clean.length === 1) {
    return [
      Math.max(1, lastVal - 1.0),
      Math.max(1, lastVal - 0.5),
      Math.max(1, lastVal - 0.5),
      lastVal,
      lastVal
    ];
  }
  if (clean.length === 2) {
    const [p1, p2] = clean;
    const avg = (p1 + p2) / 2;
    return [p1, p1, avg, p2, p2];
  }
  if (clean.length === 3) {
    const [p1, p2, p3] = clean;
    return [p1, p1, p2, p3, p3];
  }
  if (clean.length === 4) {
    const [p1, p2, p3, p4] = clean;
    return [p1, p2, p3, p4, p4];
  }
  
  // Keep last 5
  return clean.slice(-5);
}

// Sparkline SVG Component
function Sparkline({ points, strokeColor, gradientId }: { points: number[]; strokeColor: string; gradientId: string }) {
  const width = 140;
  const height = 30;
  
  if (points.length < 2) {
    points = [3.0, 3.0, 3.0, 3.0, 3.0];
  }
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1.0;
  const yMin = min - range * 0.15;
  const yMax = max + range * 0.15;
  const yRange = yMax - yMin;
  
  const linePoints = points.map((val, index) => {
    const x = 2 + (index / (points.length - 1)) * (width - 4);
    const normalized = (val - yMin) / yRange;
    const y = height - 2 - normalized * (height - 4);
    return { x, y };
  });
  
  const dPath = linePoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  const areaPath = `${dPath} L ${linePoints[linePoints.length - 1].x.toFixed(1)} ${height} L ${linePoints[0].x.toFixed(1)} ${height} Z`;
  
  return (
    <svg className="w-full h-8 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Area under the line */}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      
      {/* Path line */}
      <path
        d={dPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Data dots */}
      {linePoints.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r="2.2"
          fill="#FFFFFF"
          stroke={strokeColor}
          strokeWidth="1.2"
          className="transition-transform duration-300 hover:scale-150"
        />
      ))}
    </svg>
  );
}

export function SkillPerformance({ analytics, attempts, writingHistory }: SkillPerformanceProps) {
  // 1. Reading calculations
  const avgReading = getAverageBand(analytics, "reading");
  const readingPointsRaw = analytics.progressSeries
    .map(p => p.reading)
    .filter((v): v is number => v !== null && v !== undefined);
  const readingHasScore = avgReading !== null && avgReading > 0;
  const readingPoints = readingHasScore ? generateProgressSparkPoints(readingPointsRaw, [0, 0, 0, 0, 0]) : [0, 0, 0, 0, 0];
  const readingAttempts = attempts.filter(a => a.type === "reading" && (a.status === "completed" || a.status === "submitted"));
  const lastReadingDate = readingAttempts.length > 0 ? readingAttempts[0].lastSavedAt : null;
  const readingThisWeekCount = readingAttempts.filter(a => isWithinLast7Days(a.lastSavedAt)).length;
  
  // 2. Listening calculations
  const avgListening = getAverageBand(analytics, "listening");
  const listeningPointsRaw = analytics.progressSeries
    .map(p => p.listening)
    .filter((v): v is number => v !== null && v !== undefined);
  const listeningHasScore = avgListening !== null && avgListening > 0;
  const listeningPoints = listeningHasScore ? generateProgressSparkPoints(listeningPointsRaw, [0, 0, 0, 0, 0]) : [0, 0, 0, 0, 0];
  const listeningAttempts = attempts.filter(a => a.type === "listening" && (a.status === "completed" || a.status === "submitted"));
  const lastListeningDate = listeningAttempts.length > 0 ? listeningAttempts[0].lastSavedAt : null;
  const listeningThisWeekCount = listeningAttempts.filter(a => isWithinLast7Days(a.lastSavedAt)).length;

  // 3. Writing calculations
  const avgWriting = getAverageBand(analytics, "writing");
  const writingPointsRaw = analytics.progressSeries
    .map(p => p.writing)
    .filter((v): v is number => v !== null && v !== undefined);
  const writingHasScore = avgWriting !== null && avgWriting > 0;
  const writingPoints = writingHasScore ? generateProgressSparkPoints(writingPointsRaw, [0, 0, 0, 0, 0]) : [0, 0, 0, 0, 0];
  const writingSubmissions = writingHistory.items.filter(w => String(w.status).toLowerCase() === "completed");
  const lastWritingDate = writingSubmissions.length > 0 ? (writingSubmissions[0].graded_at ?? writingSubmissions[0].submitted_at) : null;
  const writingThisWeekCount = writingHistory.items.filter(w => isWithinLast7Days(w.submitted_at)).length;

  // Render status helper
  const getSkillBadge = (score: number | null) => {
    if (score === null || score === 0) {
      return {
        text: "Not started",
        badgeClass: "text-slate-500 bg-slate-50 border-slate-100 dark:text-slate-400 dark:bg-slate-900/40 dark:border-slate-800"
      };
    }
    if (score < 5.0) {
      return {
        text: "↓ Needs focus",
        badgeClass: "text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/30"
      };
    }
    if (score < 7.0) {
      return {
        text: "~ Improving",
        badgeClass: "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30"
      };
    }
    return {
      text: "↑ Strength",
      badgeClass: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30"
    };
  };

  const readingBadge = getSkillBadge(avgReading);
  const listeningBadge = getSkillBadge(avgListening);
  const writingBadge = getSkillBadge(avgWriting);
  const notStartedBadge = getSkillBadge(null);

  const skills: SkillCardData[] = [
    {
      key: "reading",
      label: "Reading",
      icon: BookOpenText,
      iconBg: "bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      score: readingHasScore ? avgReading.toFixed(1) : "—",
      badgeText: readingHasScore ? readingBadge.text : notStartedBadge.text,
      badgeClass: readingHasScore ? readingBadge.badgeClass : notStartedBadge.badgeClass,
      sparklineColor: "#6366F1", // Indigo
      sparklineGradientId: "spark-reading",
      sparkPoints: readingPoints,
      lastTestText: lastReadingDate ? `Last test: ${getDaysAgoText(lastReadingDate)}` : "Last test: Never",
      xpText: `+${readingThisWeekCount * 20} XP this week`,
      href: "/analytics/reading"
    },
    {
      key: "listening",
      label: "Listening",
      icon: Headphones,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      score: listeningHasScore ? avgListening.toFixed(1) : "—",
      badgeText: listeningHasScore ? listeningBadge.text : notStartedBadge.text,
      badgeClass: listeningHasScore ? listeningBadge.badgeClass : notStartedBadge.badgeClass,
      sparklineColor: "#10B981", // Emerald
      sparklineGradientId: "spark-listening",
      sparkPoints: listeningPoints,
      lastTestText: lastListeningDate ? `Last test: ${getDaysAgoText(lastListeningDate)}` : "Last test: Never",
      xpText: `+${listeningThisWeekCount * 20} XP this week`,
      href: "/analytics/listening"
    },
    {
      key: "writing",
      label: "Writing",
      icon: PenSquare,
      iconBg: "bg-violet-50 dark:bg-violet-950/40 border border-violet-100/50 dark:border-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      score: writingHasScore ? avgWriting.toFixed(1) : "—",
      badgeText: writingHasScore ? writingBadge.text : notStartedBadge.text,
      badgeClass: writingHasScore ? writingBadge.badgeClass : notStartedBadge.badgeClass,
      sparklineColor: "#8B5CF6", // Violet
      sparklineGradientId: "spark-writing",
      sparkPoints: writingPoints,
      lastTestText: lastWritingDate ? `Last test: ${getDaysAgoText(lastWritingDate)}` : "Last test: Never",
      xpText: `+${writingThisWeekCount * 30} XP this week`,
      href: "/analytics/writing"
    },
    {
      key: "speaking",
      label: "Speaking",
      icon: Mic,
      iconBg: "bg-sky-50 dark:bg-sky-950/40 border border-sky-100/50 dark:border-sky-900/30",
      iconColor: "text-sky-600 dark:text-sky-400",
      score: "—",
      badgeText: notStartedBadge.text,
      badgeClass: notStartedBadge.badgeClass,
      sparklineColor: "#F59E0B", // Amber/Orange
      sparklineGradientId: "spark-speaking",
      sparkPoints: [0, 0, 0, 0, 0],
      lastTestText: "Last test: Never",
      xpText: "+0 XP this week",
      href: "/analytics/speaking"
    }
  ];

  return (
    <section className="space-y-4">
      {/* Header section with view details link */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Skill Performance
        </h2>
        <Link
          href="/analytics/reading"
          className="group inline-flex items-center gap-1 text-[13px] font-bold text-indigo-600 transition-colors duration-200 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View Details
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Grid of skill cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((skill) => {
          const Icon = skill.icon;
          return (
            <Link key={skill.key} href={skill.href} className="block group">
              <div className="relative h-full overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm transition-colors duration-150 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-950/5 dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-indigo-500/20 dark:hover:shadow-black/20">
                <div className="flex flex-col gap-3.5">
                  {/* Card Header (Icon & Label) */}
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] shadow-sm", skill.iconBg)}>
                      <Icon className={cn("h-4.5 w-4.5", skill.iconColor)} />
                    </div>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                      {skill.label}
                    </span>
                  </div>

                  {/* Score & Pill Status Badge */}
                  <div className="flex items-baseline justify-start gap-3">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                      {skill.score}
                    </span>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold", skill.badgeClass)}>
                      {skill.badgeText}
                    </span>
                  </div>

                  {/* SVG Sparkline Graph */}
                  <div className="mt-1 h-8 w-full">
                    <Sparkline
                      points={skill.sparkPoints}
                      strokeColor={skill.sparklineColor}
                      gradientId={skill.sparklineGradientId}
                    />
                  </div>

                  {/* Divider line */}
                  <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800/60 my-0.5" />

                  {/* Footer metadata */}
                  <div className="space-y-1">
                    <p className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
                      {skill.lastTestText}
                    </p>
                    <p className="text-[11.5px] font-bold text-indigo-600 dark:text-indigo-400">
                      {skill.xpText}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
