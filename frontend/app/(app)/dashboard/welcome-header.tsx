"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardHeader } from "@/components/ui/card";
import { Layout, Sparkles, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function WelcomeHeader() {
  const { name, isPremium } = useAuthStore();
  const displayName = name?.trim() || "Candidate";
  const [desiredScore, setDesiredScore] = useState(7.5);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("prime-desired-score");
    if (saved) setDesiredScore(parseFloat(saved));
  }, []);

  const adjustScore = (delta: number) => {
    const newScore = Math.min(9, Math.max(4, desiredScore + delta));
    setDesiredScore(newScore);
    localStorage.setItem("prime-desired-score", newScore.toString());
  };

  return (
    <Card className="overflow-hidden bg-card/40 border border-border/40 relative rounded-[2rem] shadow-sm group">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />
      
      {/* Subtle background glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <CardHeader className="space-y-1 relative z-10 p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Welcome, <span className="font-medium text-primary">{displayName}</span>
                {isPremium && (
                  <span className="ml-2 inline-flex align-middle items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-[0.35rem] text-[10px] font-black uppercase tracking-[0.2em] leading-none text-primary shadow-sm">
                    <Sparkles className="h-3 w-3 fill-current" />
                    Premium Member
                  </span>
                )}
              </h1>
            </div>

            {/* Desired Score Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 border border-border/40 rounded-xl shadow-sm group/score hover:border-primary/30 transition-all">
                <Target className="h-3.5 w-3.5 text-muted-foreground/60 group-hover/score:text-primary transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mr-2">Desired Score:</span>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => adjustScore(-0.5)}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  
                  <span className="text-sm font-black text-foreground min-w-[2ch] text-center">{desiredScore.toFixed(1)}</span>
                  
                  <button 
                    onClick={() => adjustScore(0.5)}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              
            </div>
          </div>
          
          <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary shrink-0 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            {isPremium ? <PrimePremiumIcon className="h-7 w-7" /> : <Layout className="h-7 w-7" />}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
