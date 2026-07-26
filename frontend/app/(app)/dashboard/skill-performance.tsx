"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, Headphones, PenSquare, Mic } from "lucide-react";
import { DashboardTrendLineChart } from "@/components/dashboard/dashboard-trend-line-chart";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import type { AttemptRow, DashboardAnalytics } from "@/lib/types";
import type { WritingHistoryItem } from "@/lib/server-writing";
import { getAverageBand } from "@/components/charts/use-dashboard-analytics";
import { getDayTrendPoints, type DashboardTrendPoint } from "@/lib/dashboard-trend";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

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
  sparkPoints: DashboardTrendPoint[];
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

export function SkillPerformance({ analytics, attempts, writingHistory }: SkillPerformanceProps) {
  const router = useRouter();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isPremium, isAuthenticated } = useAuthStore();
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAnalyticsClick = (href: string) => {
    if (isPremium) {
      router.push(href);
      return;
    }

    setShowPremiumModal(true);
  };

  // 1. Reading calculations
  const avgReading = getAverageBand(analytics, "reading");
  const readingTrendPoints = getDayTrendPoints(analytics, "reading", 5);
  const readingHasScore = avgReading !== null && avgReading > 0;
  const readingAttempts = attempts.filter(a => a.type === "reading" && (a.status === "completed" || a.status === "submitted"));
  const lastReadingDate = readingAttempts.length > 0 ? readingAttempts[0].lastSavedAt : null;
  const readingThisWeekCount = readingAttempts.filter(a => isWithinLast7Days(a.lastSavedAt)).length;
  
  // 2. Listening calculations
  const avgListening = getAverageBand(analytics, "listening");
  const listeningTrendPoints = getDayTrendPoints(analytics, "listening", 5);
  const listeningHasScore = avgListening !== null && avgListening > 0;
  const listeningAttempts = attempts.filter(a => a.type === "listening" && (a.status === "completed" || a.status === "submitted"));
  const lastListeningDate = listeningAttempts.length > 0 ? listeningAttempts[0].lastSavedAt : null;
  const listeningThisWeekCount = listeningAttempts.filter(a => isWithinLast7Days(a.lastSavedAt)).length;

  // 3. Writing calculations
  const avgWriting = getAverageBand(analytics, "writing");
  const writingTrendPoints = getDayTrendPoints(analytics, "writing", 5);
  const writingHasScore = avgWriting !== null && avgWriting > 0;
  const writingSubmissions = writingHistory.items.filter(w => String(w.status).toLowerCase() === "completed");
  const lastWritingDate = writingSubmissions.length > 0 ? (writingSubmissions[0].graded_at ?? writingSubmissions[0].submitted_at) : null;
  const writingThisWeekCount = writingHistory.items.filter(w => isWithinLast7Days(w.submitted_at)).length;

  // 4. Speaking calculations
  const avgSpeaking = getAverageBand(analytics, "speaking");
  const speakingTrendPoints = getDayTrendPoints(analytics, "speaking", 5);
  const speakingHasScore = avgSpeaking !== null && avgSpeaking > 0;
  const speakingProgressPoints = analytics.progressSeries.filter((point) => point.speaking !== null && point.speaking !== undefined);
  const lastSpeakingDate = speakingProgressPoints.length > 0 ? speakingProgressPoints[speakingProgressPoints.length - 1].occurredAt : null;
  const speakingThisWeekCount = speakingProgressPoints.filter((point) => isWithinLast7Days(point.occurredAt)).length;

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
  const speakingBadge = getSkillBadge(avgSpeaking);
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
      sparkPoints: readingTrendPoints,
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
      sparkPoints: listeningTrendPoints,
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
      sparkPoints: writingTrendPoints,
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
      score: speakingHasScore ? avgSpeaking.toFixed(1) : "—",
      badgeText: speakingHasScore ? speakingBadge.text : notStartedBadge.text,
      badgeClass: speakingHasScore ? speakingBadge.badgeClass : notStartedBadge.badgeClass,
      sparklineColor: "#F59E0B", // Amber/Orange
      sparkPoints: speakingTrendPoints,
      lastTestText: lastSpeakingDate ? `Last test: ${getDaysAgoText(lastSpeakingDate)}` : "Last test: Never",
      xpText: `+${speakingThisWeekCount * 90} XP this week`,
      href: "/analytics/speaking"
    }
  ];

  return (
    <section className="space-y-4">
      {/* Header section with analytics overview link */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Skill Performance
        </h2>
        <button
          type="button"
          onClick={() => handleAnalyticsClick("/analytics")}
          className="group inline-flex items-center gap-1 text-[13px] font-bold text-indigo-600 transition-colors duration-200 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View Analytics
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>

      {/* Grid of skill cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((skill) => {
          const Icon = skill.icon;
          return (
            <button key={skill.key} type="button" onClick={() => handleAnalyticsClick(skill.href)} className="block h-full w-full text-left group">
              <div className="relative h-full overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white px-6 py-4 shadow-sm transition-colors duration-150 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-950/5 dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-indigo-500/20 dark:hover:shadow-black/20">
                <div className="flex flex-col gap-2.5">
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

                  {/* Trend graph */}
                  <div className="h-[52px] w-full overflow-visible px-0.5">
                    <DashboardTrendLineChart
                      points={skill.sparkPoints}
                      strokeColor={skill.sparklineColor}
                      seriesLabel={skill.label}
                      variant="compact"
                      height={52}
                      stopCardClick
                    />
                  </div>

                  {/* Divider line */}
                  <div className="h-px w-full bg-slate-100 dark:bg-slate-800/60" />

                  {/* Footer metadata */}
                  <div className="space-y-0.5 pt-0.5">
                    <p className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
                      {skill.lastTestText}
                    </p>
                    <p className="text-[11.5px] font-bold text-indigo-600 dark:text-indigo-400">
                      {skill.xpText}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {mounted && showPremiumModal
        ? createPortal(
            <PremiumUpgradeModal
              title="Analytics is Premium"
              description="Detailed analytics and skill-by-skill insights are available for Premium users."
              subscriptionHref={subscriptionHref}
              onClose={() => setShowPremiumModal(false)}
            />,
            document.body,
          )
        : null}
    </section>
  );
}
