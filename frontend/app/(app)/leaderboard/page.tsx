"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Medal, TrendingUp, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockLeaderboard } from "@/lib/mock-data";

type TypeFilter = "combined" | "reading" | "listening";

export default function LeaderboardPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("combined");

  // Mock filtering logic
  const filteredData = [...mockLeaderboard]
    .filter(entry => typeFilter === "combined" || entry.type === typeFilter || entry.isCurrentUser)
    .sort((a, b) => a.rank - b.rank);

  const top10 = filteredData.filter(e => e.rank <= 10 && !e.isCurrentUser);
  const currentUser = filteredData.find(e => e.isCurrentUser);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* Header Card */}
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        
        <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Leaderboard</CardTitle>
              <CardDescription className="text-muted-foreground text-sm font-medium">
                Compare your IELTS band scores with other candidates globally.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 lg:px-6 relative z-10 bg-background/50">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="bg-muted/40 p-1.5 rounded-[1.25rem] flex items-center overflow-x-auto no-scrollbar border border-border/50 shadow-inner w-full md:w-max">
              {[
                { id: "combined", label: "Overall" },
                { id: "reading", label: "Reading" },
                { id: "listening", label: "Listening" }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setTypeFilter(tab.id as TypeFilter)} 
                  className={cn(
                    "flex-1 sm:flex-none px-5 py-2.5 text-[14px] font-black rounded-xl transition-all whitespace-nowrap", 
                    typeFilter === tab.id 
                      ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-2px_rgba(var(--primary),0.4)] scale-[1.02]" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <div className="mt-4">
        <Card className="border-border/50 shadow-lg shadow-black/5 bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
          
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_60px] md:grid-cols-[60px_2fr_1fr_1fr_80px] items-center gap-4 p-4 md:px-8 border-b border-border/50 bg-muted/20 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="text-center">Rank</div>
            <div>Candidate</div>
            <div className="hidden sm:block text-center">Practice Breakdown</div>
            <div className="hidden sm:block text-right pr-4">Total Time</div>
            <div className="text-right">Band</div>
          </div>

          {/* Top 10 List */}
          <div className="divide-y divide-border/40">
            {top10.length > 0 ? top10.map((entry) => {
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;

              return (
                <div
                  key={`${entry.rank}-${entry.name}`}
                  className="grid grid-cols-[40px_1fr_60px] sm:grid-cols-[40px_1.5fr_1fr_1fr_60px] md:grid-cols-[60px_2fr_1fr_1fr_80px] items-center gap-4 p-4 md:px-8 hover:bg-muted/30 transition-colors group"
                >
                  {/* Rank Column */}
                  <div className="flex justify-center">
                    {isFirst ? (
                      <Trophy className="h-5 w-5 text-amber-500 drop-shadow-sm" />
                    ) : isSecond ? (
                      <Medal className="h-5 w-5 text-slate-400 drop-shadow-sm" />
                    ) : isThird ? (
                      <Medal className="h-5 w-5 text-orange-600/80 drop-shadow-sm" />
                    ) : (
                      <span className="font-bold text-base text-muted-foreground group-hover:text-foreground transition-colors">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Candidate Column */}
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className={cn(
                      "h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                      isFirst ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20" :
                      isSecond ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20" :
                      isThird ? "bg-orange-500/10 text-orange-600 dark:text-orange-500 ring-1 ring-orange-500/20" :
                      "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                    )}>
                      {entry.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-sm md:text-base text-foreground truncate">{entry.name}</p>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 truncate sm:hidden">
                        {entry.attempts} tests
                      </p>
                    </div>
                  </div>

                  {/* Breakdown Column */}
                  <div className="hidden sm:flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 text-[11px] font-medium">
                      <span className="text-blue-500 font-bold">{entry.readingAttempts} R</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-emerald-500 font-bold">{entry.listeningAttempts} L</span>
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      {entry.attempts} Total
                    </p>
                  </div>

                  {/* Time Column */}
                  <div className="hidden sm:flex justify-end pr-4">
                    <Badge variant="outline" className="bg-muted/50 border-border/50 text-muted-foreground font-mono font-bold tracking-tight">
                      {entry.totalTime}
                    </Badge>
                  </div>

                  {/* Score Column */}
                  <div className="text-right flex flex-col items-end">
                    <p className={cn(
                      "text-lg md:text-xl font-black tracking-tight",
                      isFirst ? "text-amber-500" :
                      isSecond ? "text-slate-500 dark:text-slate-300" :
                      isThird ? "text-orange-600 dark:text-orange-400" :
                      "text-foreground"
                    )}>
                      {entry.band}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="p-12 text-center text-sm font-bold text-muted-foreground">
                No ranking data available for this filter.
              </div>
            )}
          </div>

          {/* Current User Row */}
          {currentUser && (
            <div className="border-t-2 border-primary/20 bg-primary/[0.03] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              
              {currentUser.rank > 10 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background border border-border/50 text-muted-foreground px-2 py-0.5 rounded-full z-10 shadow-sm">
                  <Minus className="h-4 w-4" />
                </div>
              )}

              <div className="grid grid-cols-[40px_1fr_60px] sm:grid-cols-[40px_1.5fr_1fr_1fr_60px] md:grid-cols-[60px_2fr_1fr_1fr_80px] items-center gap-4 p-4 md:px-8 mt-2">
                <div className="flex flex-col items-center">
                  <span className="font-black text-primary text-base md:text-lg">{currentUser.rank}</span>
                  <TrendingUp className="h-3 w-3 text-emerald-500 mt-1" />
                </div>

                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                    You
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-sm md:text-base text-primary truncate">Your Ranking</p>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 truncate sm:hidden">
                      {currentUser.attempts} tests
                    </p>
                  </div>
                </div>

                {/* Breakdown Column */}
                <div className="hidden sm:flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2 text-[11px] font-medium">
                    <span className="text-blue-500 font-bold">{currentUser.readingAttempts} R</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-emerald-500 font-bold">{currentUser.listeningAttempts} L</span>
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {currentUser.attempts} Total
                  </p>
                </div>

                {/* Time Column */}
                <div className="hidden sm:flex justify-end pr-4">
                  <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-mono font-bold tracking-tight">
                    {currentUser.totalTime}
                  </Badge>
                </div>

                <div className="text-right flex flex-col items-end">
                  <p className="text-xl md:text-2xl font-black tracking-tight text-primary drop-shadow-sm">{currentUser.band}</p>
                  <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">Current</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
