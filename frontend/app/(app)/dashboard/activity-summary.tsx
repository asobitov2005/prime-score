"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Headphones, PenSquare, Mic, Clock, Trophy, X, Activity as ActivityIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardAnalytics } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

interface ActivitySummaryProps {
  analytics: DashboardAnalytics;
}

function formatJoinedDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatHours(value: number | null | undefined): string {
  const safeHours = Math.max(0, Number(value ?? 0));
  return `${safeHours === 0 ? 0 : safeHours.toFixed(1)}h`;
}

export function ActivitySummary({ analytics }: ActivitySummaryProps) {
  const summary = analytics.performanceSummary;
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const router = useRouter();
  const readingTimeHours = formatHours(summary.studyTime.readingTimeSec / 3600);
  const listeningTimeHours = formatHours(summary.studyTime.listeningTimeSec / 3600);
  const writingTimeHours = formatHours((summary.studyTime.writingTimeSec ?? 0) / 3600);
  const speakingTimeHours = formatHours(0);
  
  const activities = [
    {
      id: "reading",
      label: "Reading",
      href: "/tests?type=reading",
      count: summary.reading.fullCount,
      unit: "Tests",
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      details: {
        time: readingTimeHours,
        breakdown: [
          { name: "Full Tests", value: summary.reading.fullCount },
          { name: "Passage 1", value: summary.reading.section1Count },
          { name: "Passage 2", value: summary.reading.section2Count },
          { name: "Passage 3", value: summary.reading.section3Count },
        ]
      }
    },
    {
      id: "listening",
      label: "Listening",
      href: "/tests?type=listening",
      count: summary.listening.fullCount,
      unit: "Tests",
      icon: Headphones,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      details: {
        time: listeningTimeHours,
        breakdown: [
          { name: "Full Tests", value: summary.listening.fullCount },
          { name: "Part 1", value: summary.listening.section1Count },
          { name: "Part 2", value: summary.listening.section2Count },
          { name: "Part 3", value: summary.listening.section3Count },
          { name: "Part 4", value: summary.listening.section4Count },
        ]
      }
    },
    {
      id: "writing",
      label: "Writing",
      href: "/writing",
      count: summary.writing?.fullCount || 0,
      unit: "Tasks",
      icon: PenSquare,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
      details: {
        time: writingTimeHours,
        breakdown: [
          { name: "Task 1", value: summary.writing?.section1Count ?? 0 },
          { name: "Task 2", value: summary.writing?.section2Count ?? 0 },
        ]
      }
    },
    {
      id: "speaking",
      label: "Speaking",
      href: "/speaking",
      count: 0,
      unit: "Sessions",
      icon: Mic,
      color: "text-orange-600",
      bg: "bg-orange-500/10",
      details: {
        time: speakingTimeHours,
        breakdown: [
          { name: "Part 1", value: 0 },
          { name: "Part 2 & 3", value: 0 },
        ]
      }
    },
  ];

  const activeData = activities.find(a => a.id === selectedSection);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full">
        {activities.map((act) => (
          <Card 
            key={act.label} 
            onClick={() => setSelectedSection(act.id)}
            className={cn(
              "border border-border/50 shadow-sm transition-all duration-300 rounded-[1.5rem] overflow-hidden group h-full relative cursor-pointer",
              "bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md",
              "hover:shadow-md hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1"
            )}
          >
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br via-transparent to-transparent pointer-events-none", act.bg.replace('/10', '/5'))} />
            
            <CardContent className="p-4 flex flex-col items-center text-center justify-center h-full relative z-10">
              <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm mb-3 transition-all duration-500",
                "group-hover:scale-110 group-hover:rotate-3",
                act.bg
              )}>
                <act.icon className={cn("h-5 w-5 transition-transform duration-500", act.color)} />
              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/60 mb-1 group-hover:text-foreground transition-colors">{act.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tighter text-foreground leading-none">{act.count}</span>
                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">{act.unit}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Portal Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence mode="wait">
          {selectedSection && activeData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSection(null)}
                className="absolute inset-0 bg-background/60 backdrop-blur-sm cursor-pointer"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[400px] bg-background/95 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className={cn("absolute inset-0 h-40 opacity-10 bg-gradient-to-b to-transparent", activeData.bg.replace('/10', ''))} />
                
                <div className="p-6 sm:p-7 relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-700 hover:rotate-6", activeData.bg)}>
                        <activeData.icon className={cn("h-7 w-7", activeData.color)} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-foreground">{activeData.label}</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                          <ActivityIcon className="h-3 w-3" />
                          Insights
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedSection(null)}
                      className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-card/40 border border-border/10 p-4 rounded-xl group transition-all hover:border-primary/20">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Time Spent</span>
                      </div>
                      <p className="text-xl font-black tracking-tighter text-foreground">{activeData.details.time}</p>
                    </div>
                    <div className="bg-card/40 border border-border/10 p-4 rounded-xl group transition-all hover:border-primary/20">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Trophy className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Total {activeData.unit}</span>
                      </div>
                      <p className="text-xl font-black tracking-tighter text-foreground">{activeData.count}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Breakdown</p>
                      <span className="text-[9px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">Monthly</span>
                    </div>
                    <div className="space-y-2">
                      {activeData.details.breakdown.map((item, idx) => {
                        const maxValue = Math.max(...activeData.details.breakdown.map(b => b.value));
                        const progress = (item.value / (maxValue || 1)) * 100;
                        
                        return (
                          <div 
                            key={item.name}
                            className="p-2.5 rounded-xl bg-card/30 border border-border/5 hover:border-border/20 transition-all group relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between relative z-10 mb-2">
                              <div className="flex items-center gap-2">
                                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-background/60 shadow-sm transition-transform duration-500 group-hover:scale-110")}>
                                   <activeData.icon className={cn("h-3 w-3", activeData.color)} />
                                </div>
                                <span className="text-[11px] font-bold text-foreground/80">{item.name}</span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs font-black text-foreground">{item.value}</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Done</span>
                              </div>
                            </div>
                            
                            <div className="h-1 w-full bg-muted/10 rounded-full overflow-hidden relative z-10">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 + idx * 0.1 }}
                                className={cn("h-full rounded-full bg-gradient-to-r to-transparent", 
                                  activeData.id === 'reading' ? 'from-blue-500' : 
                                  activeData.id === 'listening' ? 'from-emerald-500' : 
                                  activeData.id === 'writing' ? 'from-violet-500' : 'from-orange-500'
                                )} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border/10">
                    <button 
                      onClick={() => router.push(activeData.href)}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>Start Practice Session</span>
                      <X className="h-3.5 w-3.5 rotate-[-135deg] group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export function StudyTimeCard({ analytics }: ActivitySummaryProps) {
  const summary = analytics.performanceSummary;
  const studyTime = summary.studyTime;
  const createdAt = useAuthStore((state) => state.createdAt);
  const joinedDate = formatJoinedDate(createdAt);
  const thisWeekMinutes = studyTime.thisWeekMinutes ?? Math.round(studyTime.totalTimeSec / 60);
  const dailyGoalMinutes = studyTime.dailyGoalMinutes ?? 90;
  const weeklyHours = (thisWeekMinutes / 60).toFixed(1);
  const goalProgress = Math.min(100, Math.round((thisWeekMinutes / dailyGoalMinutes / 7) * 100));

  return (
    <Card className="h-full border-none ring-1 ring-primary/20 shadow-md shadow-primary/5 bg-gradient-to-br from-primary/5 via-card/50 to-background rounded-[1.5rem] overflow-hidden group">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-[0.12em]">Study Time</h3>
          </div>
          <div className="bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Trophy className="h-2.5 w-2.5 text-emerald-600" />
            <span className="text-[9px] font-semibold text-emerald-600">{goalProgress}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end gap-1.5">
              <span className="text-[2rem] font-semibold tracking-tight text-foreground leading-none">{weeklyHours}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">Hours</span>
            </div>
            {joinedDate && (
              <p className="text-[11px] font-medium text-muted-foreground/80 text-right">
                Registered on <span className="text-foreground/85">{joinedDate}</span>
              </p>
            )}
          </div>
          <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${goalProgress}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
