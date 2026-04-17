"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, BookOpenText, Headphones, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockTests } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const skills = ["Reading", "Listening", "Writing", "Speaking"];

const benefits = [
  "Reading and Listening only",
  "Practice and exam modes",
  "Telegram-only authentication"
];

export default function LandingPage() {
  const [skillIndex, setSkillIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSkillIndex((current) => (current + 1) % skills.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto max-w-[1600px] px-4 py-16 sm:px-8 lg:px-12 lg:py-24 overflow-hidden min-h-[calc(100vh-80px)] flex items-center">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-in fade-in duration-1000" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-in fade-in duration-1000 delay-500" />

      <section className="relative z-10 w-full grid gap-16 lg:gap-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        
        {/* Left Column: Text & CTAs */}
        <div className="space-y-8 md:space-y-10">
          <div className="space-y-4">
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out fill-mode-both">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-md backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm md:text-base font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Free CDI IELTS Tests
                </span>
              </div>
            </div>
          </div>
          
          
          <h1 className="max-w-2xl text-5xl font-black tracking-tighter text-foreground sm:text-6xl md:text-[5rem] lg:text-[5.5rem] leading-[1.1] animate-in fade-in slide-in-from-bottom-10 duration-700 ease-out delay-150 fill-mode-both">
            Master your <br className="hidden md:block"/>
            <span className="relative inline-flex flex-col h-[1.15em] overflow-hidden align-bottom">
               {skills.map((skill, index) => (
                 <span
                   key={skill}
                   className={cn(
                     "absolute left-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60",
                     index === skillIndex 
                       ? "translate-y-0 opacity-100" 
                       : index < skillIndex 
                         ? "-translate-y-[120%] opacity-0" 
                         : "translate-y-[120%] opacity-0"
                   )}
                 >
                   {skill}
                 </span>
               ))}
               <span className="invisible pointer-events-none">Listening.</span>
            </span>
          </h1>

          
          <p className="max-w-2xl text-lg md:text-xl font-medium leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out delay-300 fill-mode-both">
            <span className="font-bold text-foreground">
              <span className="text-foreground">Prime</span>
              <span className="text-primary">Score</span>
            </span> is designed for self-study IELTS candidates. Experience strict exam conditions, comprehensive scoring, and actionable insights.
          </p>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out delay-500 fill-mode-both">
            <Button asChild size="lg" className="group h-14 px-8 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1 rounded-xl">
              <Link href="/tests" className="inline-flex items-center gap-2">
                Explore tests
                <ArrowRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 text-base font-bold border-2 border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/5 transition-all duration-300 hover:-translate-y-1 rounded-xl shadow-sm">
              <Link href="/login" className="inline-flex items-center gap-2">
                Login with Telegram
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-8 border-t border-border/40 animate-in fade-in duration-700 ease-out delay-700 fill-mode-both">
            <div className="flex items-center gap-2.5 group">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(255,165,0,0.5)]" />
              <span className="text-sm font-bold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">Real Exam Experience</span>
            </div>
            <div className="flex items-center gap-2.5 group">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(255,165,0,0.5)]" />
              <span className="text-sm font-bold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">Accurate AI Scoring</span>
            </div>
            <div className="flex items-center gap-2.5 group">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(255,165,0,0.5)]" />
              <span className="text-sm font-bold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">Comprehensive Insights</span>
            </div>
          </div>
        </div>

        {/* Right Column: Feature Card */}
        <div className="relative animate-in fade-in slide-in-from-right-12 duration-1000 ease-out delay-300 fill-mode-both">
          {/* Decorative rotating background blob behind the card */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent rounded-[2rem] blur-2xl -z-10 animate-pulse duration-3000" />
          
          <Card className="relative overflow-hidden border border-border/40 shadow-2xl bg-card/70 backdrop-blur-xl rounded-3xl group transition-all duration-500 hover:border-primary/20 hover:shadow-primary/10">
            {/* Subtle inner top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <CardHeader className="space-y-3 bg-muted/20 border-b border-border/40 p-8 transition-colors group-hover:bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Platform features</CardTitle>
              </div>
              <CardDescription className="text-base font-medium text-muted-foreground">
                Everything you need to prepare effectively in one clean dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <MiniFeature icon={<BookOpenText className="h-6 w-6" />} label="Tests catalog" value="Extensive library of authentic tests" />
                <MiniFeature icon={<Headphones className="h-6 w-6" />} label="Listening" value="Integrated audio player with seek" />
                <MiniFeature icon={<ShieldCheck className="h-6 w-6" />} label="Secure" value="Seamless Telegram login" />
                <MiniFeature icon={<Zap className="h-6 w-6" />} label="Analytics" value="Track performance and progress" />
              </div>
              <div className="rounded-2xl bg-secondary/40 p-6 border border-border/40 backdrop-blur-sm transition-colors group-hover:bg-secondary/60">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Featured tests</p>
                <div className="space-y-3">
                  {mockTests.slice(0, 2).map((test) => (
                    <Link key={test.id} href={`/tests/${test.id}`} className="group/link flex items-center justify-between rounded-xl border border-border/50 bg-background/80 p-4 transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
                      <div>
                        <p className="font-bold text-foreground group-hover/link:text-primary transition-colors">{test.title}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">{test.sourceDetail}</p>
                      </div>
                      <Badge tone={test.accessType === "premium" ? "warning" : "success"} className="uppercase tracking-widest font-black text-[10px] px-2.5 py-1">{test.accessType}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function MiniFeature({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 group/feature">
      <div className="rounded-xl bg-primary/10 p-3 text-primary shadow-sm ring-1 ring-primary/10 transition-all duration-300 group-hover/feature:scale-110 group-hover/feature:bg-primary/15 group-hover/feature:ring-primary/30">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-base font-bold text-foreground leading-none">{label}</p>
        <p className="text-sm font-medium text-muted-foreground leading-snug">{value}</p>
      </div>
    </div>
  );
}
