"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "@/hooks/use-in-view";
import { ArrowRight, BookOpenText, CheckCircle2, Headphones, Mic2, PenSquare, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import { PricingPlanGrid } from "@/components/marketing/pricing-plan-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ReviewItem } from "@/lib/mock-data";
import type { MarketingPlan } from "@/lib/server-plans";
import { cn } from "@/lib/utils";

const listeningWaveHeights = [42, 68, 35, 82, 58, 94, 46, 76, 28, 63, 88, 51, 72, 39, 96, 55, 80, 31, 66, 91, 44, 74, 36, 60];
const speakingWaveHeights = [48, 72, 39, 83, 56, 90, 44, 78, 52];

const sectionPages = [
  {
    id: "reading",
    title: "Reading Mock Practice",
    desc: "Highlight text, right-click to take notes, and tackle True/False/Not Given questions using our split-screen architecture.",
    href: "/ielts-reading-mock-online",
    icon: <BookOpenText className="w-6 h-6 text-orange-500" />,
    boxFrom: { x: -100, y: -100, rotate: -5 },
    className: "bg-gradient-to-br from-card/80 to-card/40 border-orange-500/20",
    content: (
      <div className="mt-8 relative h-[180px] bg-background/50 rounded-xl border border-border/50 p-4 flex gap-4 overflow-hidden shadow-inner">
        <div className="w-1/2 border-r border-border/50 pr-4 space-y-2 relative pt-2">
          <div className="h-2 w-3/4 bg-foreground/20 rounded"></div>
          <div className="h-2 w-full bg-foreground/10 rounded"></div>
          <div className="h-2 w-full bg-orange-500/30 rounded border-b border-orange-500/50 mt-4 mb-4"></div>
          <div className="h-2 w-5/6 bg-foreground/10 rounded"></div>
          <div className="h-2 w-4/6 bg-foreground/10 rounded"></div>
        </div>
        <div className="w-1/2 space-y-5 pt-2">
          <div className="h-8 w-full rounded bg-orange-500/10 border border-orange-500/20 flex items-center px-2">
            <div className="w-3 h-3 rounded-full border border-orange-500/50 mr-2 shrink-0"></div>
            <div className="h-1.5 w-1/2 bg-orange-500/40 rounded"></div>
          </div>
          <div className="h-8 w-full rounded bg-foreground/5 border border-border/50 flex items-center px-2">
            <div className="w-3 h-3 rounded-full border border-border/50 mr-2 shrink-0"></div>
            <div className="h-1.5 w-2/3 bg-foreground/20 rounded"></div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "listening",
    title: "Listening Mock Practice",
    desc: "Experience the real CBT audio interface. Multi-part audios, map labeling, and drag-and-drop questions.",
    href: "/ielts-listening-mock-online",
    icon: <Headphones className="w-6 h-6 text-blue-500" />,
    boxFrom: { x: 100, y: -100, rotate: 5 },
    className: "bg-gradient-to-br from-card/80 to-card/40 border-blue-500/20",
    content: (
      <div className="mt-8 relative h-[180px] bg-background/50 rounded-xl border border-border/50 p-4 overflow-hidden shadow-inner flex flex-col justify-between">
        <div className="flex justify-between items-center border-b border-border/50 pb-3 pt-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50 shrink-0">
              <div className="w-2 h-2 bg-blue-400 rounded-sm"></div>
            </div>
            <div className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate">Part 1. Section A</div>
          </div>
          <div className="text-[10px] sm:text-xs font-mono text-blue-500 shrink-0">02:14 / 05:30</div>
        </div>
        <div className="flex items-end gap-1 h-16 w-full mt-auto">
          {listeningWaveHeights.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-blue-500/40 rounded-t-sm"
              style={{ height: `${height}%` }}
            ></div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "writing",
    title: "Writing Feedback",
    desc: "Submit Task 1 & 2. Our AI highlights grammar issues, suggests C1/C2 vocabulary, and calculates Band Score.",
    href: "/writing",
    icon: <PenSquare className="w-6 h-6 text-violet-500" />,
    boxFrom: { x: -100, y: 100, rotate: 5 },
    className: "bg-gradient-to-br from-card/80 to-card/40 border-violet-500/20",
    content: (
      <div className="mt-8 relative h-[180px] bg-background/50 rounded-xl border border-border/50 p-4 shadow-inner flex flex-col gap-4">
        <div className="font-mono text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
          The graph illustrates the <span className="text-red-400 line-through bg-red-500/10 px-1 rounded mx-1">ammount</span> of energy...
        </div>
        <div className="absolute top-16 left-6 bg-card border border-violet-500/30 p-2.5 rounded-lg shadow-xl flex items-center gap-2 z-10 w-fit">
          <div className="w-5 h-5 bg-violet-500/20 rounded-full flex items-center justify-center shrink-0">
            <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
          </div>
          <span className="text-violet-500 font-mono text-[11px] sm:text-xs tracking-tight whitespace-nowrap">amount (spelling)</span>
        </div>
        <div className="mt-auto border-t border-border/50 pt-3 flex justify-between items-center">
          <div className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">Estimated Band</div>
          <div className="text-base sm:text-lg font-bold text-violet-500">7.0</div>
        </div>
      </div>
    )
  },
  {
    id: "speaking",
    title: "Speaking Preparation",
    desc: "An AI examiner asks you questions, records your voice, and evaluates fluency, lexical resource, and pronunciation.",
    href: "/ielts-speaking-mock-online",
    icon: <Mic2 className="w-6 h-6 text-emerald-500" />,
    boxFrom: { x: 100, y: 100, rotate: -5 },
    className: "bg-gradient-to-br from-card/80 to-card/40 border-emerald-500/20",
    content: (
      <div className="mt-8 relative h-[180px] bg-background/50 rounded-xl border border-border/50 p-4 shadow-inner flex flex-col items-center justify-between">
        <div className="flex flex-col items-center gap-2 mt-4 z-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 p-[2px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-[10px] sm:text-xs font-mono text-foreground/80 mt-1 font-medium bg-background/80 px-2 py-0.5 rounded-full border border-border/50">AI Examiner</div>
        </div>
        <div className="flex gap-1.5 items-end h-16 mt-auto mb-2 opacity-80">
          {speakingWaveHeights.map((height, i) => (
            <div
              key={i}
              className="w-2 sm:w-2.5 rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400"
              style={{ height: `${height}%` }}
            ></div>
          ))}
        </div>
      </div>
    )
  }
];

const skills = ["Reading.", "Listening.", "Writing.", "Speaking."];

type LandingFeaturedTest = {
  id: string;
  slug: string;
  title: string;
  type: string;
  source: string;
  questionCount: number;
  estimatedMinutes: number;
  isPremiumLocked: boolean;
  createdAt: string;
};

function ScrollReveal({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const [ref, inView] = useInView({ threshold: 0.1 });
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      id={id}
      className={cn(
        className,
        "transition-[opacity,transform] duration-700 ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      )}
    >
      {children}
    </div>
  );
}

interface LandingPageClientProps {
  plans: MarketingPlan[];
  reviews: ReviewItem[];
  onlineCount: number;
  initialTests?: LandingFeaturedTest[];
}

function formatOnlineCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function LandingPageClient({ plans, reviews, onlineCount, initialTests = [] }: LandingPageClientProps) {
  const [isReviewsVisible, setIsReviewsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsReviewsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (reviewsRef.current) {
      observer.observe(reviewsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const getDisplayedTests = () => {
    const sourceTests = initialTests;
    let filtered = sourceTests;

    if (activeTab !== "All") {
      filtered = sourceTests.filter((test) => test.type.toLowerCase() === activeTab.toLowerCase());
      return filtered.slice(0, 4);
    }

    const readingTests = sourceTests.filter((test) => test.type === "reading").slice(0, 2);
    const listeningTests = sourceTests.filter((test) => test.type === "listening").slice(0, 2);

    return [...readingTests, ...listeningTests].slice(0, 4);
  };

  const displayedTests = getDisplayedTests();

  return (
    <div className="relative mx-auto max-w-[1600px] overflow-hidden">
      <div className="w-full px-4 pt-8 pb-0 sm:px-12 sm:pt-12 sm:pb-0 lg:px-16 lg:pt-20 lg:pb-0 origin-top transform scale-100 md:scale-[0.85] xl:scale-[0.9] transition-transform mx-auto md:-mb-[12%] xl:-mb-[8%]">
        <ScrollReveal className="relative z-10 w-full grid gap-12 lg:gap-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-start pt-0 md:pt-4">
          <div className="space-y-8 md:space-y-10 min-w-0">
            <div className="space-y-4">
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out fill-mode-both">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                    Free IELTS Mock Tests Online
                  </span>
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 ease-out fill-mode-both flex flex-col">
                <span>Master Your IELTS</span>
                <span className="relative h-[1.15em] overflow-hidden inline-block w-full">
                  <span className="landing-skill-track flex flex-col">
                    {[...skills, skills[0]].map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="h-[1.15em] bg-gradient-to-r from-primary/80 via-primary to-primary/60 bg-clip-text text-transparent pb-2"
                      >
                        {skill}
                      </span>
                    ))}
                  </span>
                </span>
              </h1>

              <p className="text-base sm:text-lg font-medium text-muted-foreground/90 max-w-xl leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 ease-out fill-mode-both">
                Practice IELTS mock tests online from your own device.
                <span className="hidden sm:inline"> Track your band score, review mistakes, and prepare each IELTS section with focus.</span>
              </p>

              <div className="flex flex-wrap items-center gap-6 sm:gap-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-400 ease-out fill-mode-both">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[
                      { initial: "A", bg: "bg-blue-500" },
                      { initial: "M", bg: "bg-emerald-500" },
                      { initial: "S", bg: "bg-amber-500" },
                    ].map((user, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background text-[10px] font-semibold text-white shadow-sm",
                          user.bg,
                        )}
                      >
                        {user.initial}
                      </div>
                    ))}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-primary text-[9px] font-semibold uppercase text-primary-foreground">
                      Live
                    </div>
                  </div>
                  <div className="flex flex-col -space-y-0.5">
                    <span className="text-[13px] font-semibold text-foreground">{formatOnlineCount(onlineCount)} online</span>
                    <p className="text-[10px] font-medium text-muted-foreground/70 tracking-tight">Active students</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-0 md:pl-4 border-l-0 md:border-l border-border/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col -space-y-0.5">
                    <span className="text-[13px] font-semibold text-foreground">120+ IELTS mocks</span>
                    <p className="text-[10px] font-medium text-muted-foreground/70 tracking-tight">Online practice</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-row items-center gap-3 pt-2 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 ease-out fill-mode-both">
              <MarketingAuthCta
                guestLabel="Get Started"
                authLabel="Dashboard"
                className="h-11 px-5 text-sm font-semibold shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 rounded-xl bg-primary text-background"
              />
              <Button asChild variant="outline" className="h-11 px-5 text-sm font-medium border-border/60 bg-background/50 hover:bg-muted/50 rounded-xl transition-colors">
                <Link href="#features">
                  View Features
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative w-full max-w-lg min-w-0 mx-auto mt-0 lg:-mt-6 lg:mx-0 animate-in fade-in slide-in-from-right-10 duration-1000 delay-300 ease-out fill-mode-both">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)] pointer-events-none transform-gpu -z-10" />

            <div className="relative rounded-3xl border border-border/50 bg-card shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] transition-shadow duration-300 overflow-hidden flex flex-col transform-gpu">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />

              <div className="p-6 md:p-8 space-y-5 relative z-10 pt-8">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-lg md:text-xl tracking-tight text-foreground">Featured Tests</h3>
                  <Link href="/tests" className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="bg-muted/30 p-1.5 rounded-[1.25rem] flex items-center justify-between overflow-x-auto no-scrollbar border border-border/10 shadow-inner">
                  {["All", "Reading", "Listening"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-[13px] md:text-[14px] font-medium rounded-xl transition-[background-color,color,box-shadow,border-color,transform] duration-200 whitespace-nowrap",
                        activeTab === tab
                          ? "bg-background text-foreground shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12)] border border-border/50 scale-[1.02]"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {displayedTests.length > 0 ? displayedTests.map((test) => {
                    const isReading = test.type === "reading";
                    const isListening = test.type === "listening";

                    const cardBg = isReading ? "bg-orange-50/50 dark:bg-orange-950/10" : isListening ? "bg-blue-50/50 dark:bg-blue-950/10" : "bg-purple-50/50 dark:bg-purple-950/10";
                    const cardBorder = isReading ? "border-orange-100 dark:border-orange-900/30" : isListening ? "border-blue-100 dark:border-blue-900/30" : "border-purple-100 dark:border-purple-900/30";
                    const iconBgColor = isReading ? "bg-orange-100 dark:bg-orange-900/40" : isListening ? "bg-blue-100 dark:bg-blue-900/40" : "bg-purple-100 dark:bg-purple-900/40";
                    const iconColor = isReading ? "text-[#e86c27] dark:text-orange-400" : isListening ? "text-[#2e7ddb] dark:text-blue-400" : "text-[#7c5cdb] dark:text-purple-400";
                    const badgeBg = test.isPremiumLocked ? "bg-orange-100 dark:bg-orange-900/40" : "bg-emerald-100 dark:bg-emerald-900/40";
                    const badgeText = test.isPremiumLocked ? "text-[#c25010] dark:text-orange-400" : "text-[#059669] dark:text-emerald-400";
                    const badgeLabel = test.isPremiumLocked ? "Pro" : "Free";
                    return (
                      <Link
                        key={test.id}
                        href={`/tests/${test.slug}`}
                        className={cn(
                          "group relative overflow-hidden flex items-center justify-between gap-4 p-3 md:p-4 rounded-2xl border transition-[background-color,border-color,box-shadow,transform] duration-150 hover:scale-[1.01] hover:shadow-md cursor-pointer",
                          cardBg,
                          cardBorder,
                        )}
                      >
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                          <div className={cn("flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 relative z-10", iconBgColor, iconColor)}>
                            {isReading ? (
                              <BookOpenText className="h-5 w-5 md:h-6 md:w-6" />
                            ) : isListening ? (
                              <Headphones className="h-5 w-5 md:h-6 md:w-6" />
                            ) : (
                              <span className="font-serif font-semibold text-base md:text-lg">W</span>
                            )}
                          </div>
                          <div className="space-y-1 min-w-0 relative z-10">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[14px] md:text-[15px] text-foreground leading-tight truncate">{test.title}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] md:text-[12px] font-medium text-muted-foreground/80">
                              <span className="uppercase tracking-wider font-medium">{test.source.replace("Official", "").trim()}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span>{test.questionCount} questions</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span>{test.estimatedMinutes} min</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 pl-1">
                          <span className={cn("hidden sm:flex px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm", badgeBg, badgeText)}>
                            {badgeLabel}
                          </span>
                          <div className="flex h-10 w-10 items-center justify-center text-[#0a1b3f] dark:text-foreground/80 transition-[color,transform] duration-200 group-hover:scale-125 group-hover:text-[#d94b04] dark:group-hover:text-primary">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M18.4452 11.0253C19.1837 11.4554 19.1837 12.5446 18.4452 12.9747L7.66492 19.2598C6.9264 19.6899 6 19.1504 6 18.2851L6 5.71493C6 4.8496 6.9264 4.31012 7.66492 4.74021L18.4452 11.0253Z"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    );
                  }) : (
                    <EmptyState
                      compact
                      icon="search"
                      title={activeTab === "All" ? "No tests found" : `No ${activeTab.toLowerCase()} tests found`}
                      description="Published IELTS tests will appear here as soon as they are available."
                      className="border-dashed bg-muted/15 shadow-none"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <section id="features" className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30 [content-visibility:auto] [contain-intrinsic-size:980px]">
          <div className="max-w-6xl mx-auto space-y-6 mb-12 text-center">
            <h2 className="text-[15px] min-[380px]:text-lg sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Online IELTS mock practice for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">every section.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-base md:text-lg leading-relaxed">
              Start with a full mock, or focus on Reading, Listening, Writing feedback, or Speaking preparation.
            </p>
          </div>

          <ScrollReveal className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-[1600px]">
            {sectionPages.map((mod, i) => (
              <Link
                key={mod.id}
                href={mod.href}
                style={{ transitionDelay: `${i * 100}ms` }}
                className={cn(
                  "group relative rounded-[2rem] border p-6 flex flex-col transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(var(--primary),0.15)] hover:border-primary/40 overflow-hidden cursor-pointer",
                  mod.className
                )}
              >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div
                  className="relative z-10 h-full flex flex-col"
                >
                  <div className="w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center border border-border/50 mb-5 shadow-sm group-hover:scale-110 group-hover:bg-card transition-[transform,background-color] duration-200">
                    {mod.icon}
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
                    {mod.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 group-hover:text-foreground/80 transition-colors duration-300">
                    {mod.desc}
                  </p>

                  <div className="mt-auto pt-4 scale-[0.85] origin-bottom sm:scale-100 xl:scale-[0.8] 2xl:scale-90 group-hover:scale-[0.88] sm:group-hover:scale-105 xl:group-hover:scale-[0.85] 2xl:group-hover:scale-95 transition-transform duration-500">
                    {mod.content}
                  </div>
                </div>
              </Link>
            ))}
          </ScrollReveal>
        </section>

        <ScrollReveal id="pricing" className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30 [content-visibility:auto] [contain-intrinsic-size:820px]">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Pricing that matches your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">exam timeline.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-3xl mx-auto leading-relaxed">
              Start with free public tests, then move into premium when you want explanations, writing feedback, more premium sets, and a longer IELTS prep runway.
            </p>
          </div>

          <PricingPlanGrid plans={plans} compact />

          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-medium border-border/60 hover:bg-muted/50 hover:text-foreground hover:scale-105 transition-[background-color,color,transform] shadow-xl bg-background/80">
              <Link href="/pricing">
                Compare all plans <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal
          id="reviews"
          className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30 pb-20 [content-visibility:auto] [contain-intrinsic-size:820px]"
        >
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">Students.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-2xl mx-auto">
              See how PrimeScore is helping students achieve their target band scores.
            </p>
          </div>

          <div
            ref={reviewsRef}
            className={cn("relative h-[600px] overflow-hidden", isReviewsVisible ? "opacity-100" : "opacity-0 transition-opacity duration-1000")}
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full px-2">
              <div className={cn("flex flex-col gap-6", isReviewsVisible && "animate-marquee-down hover:[animation-play-state:paused]")}>
                {[...reviews, ...reviews].map((review, index) => (
                  <ReviewCard key={`col1-${index}`} review={review} />
                ))}
              </div>

              <div className={cn("hidden md:flex flex-col gap-6", isReviewsVisible && "animate-marquee-up hover:[animation-play-state:paused]")}>
                {[...reviews].reverse().concat([...reviews].reverse()).map((review, index) => (
                  <ReviewCard key={`col2-${index}`} review={review} />
                ))}
              </div>

              <div className={cn("hidden md:flex flex-col gap-6", isReviewsVisible && "animate-marquee-down hover:[animation-play-state:paused]")}>
                {[...reviews.slice(3), ...reviews.slice(0, 3), ...reviews.slice(3), ...reviews.slice(0, 3)].map((review, index) => (
                  <ReviewCard key={`col3-${index}`} review={review} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center relative z-20">
            <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-medium border-border/60 hover:bg-muted/50 hover:text-foreground hover:scale-105 transition-[background-color,color,transform] shadow-xl bg-background/80">
              <Link href="/reviews">
                View all reviews <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal className="relative z-10 w-full mt-0 border-t border-border/30 pt-24 pb-3 text-center flex flex-col items-center overflow-hidden [content-visibility:auto] [contain-intrinsic-size:420px]">
          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Ready to Practice Like It's the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">Real Exam?</span>
            </h2>
            <p className="text-lg md:text-xl font-medium text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
              Experience strict test conditions, instant scoring, writing feedback, and focused online practice.
            </p>

            <div className="pt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 flex justify-center">
              <div className="aurora-btn rounded-xl">
                <div className="aurora-btn-inner bg-background"></div>
                <MarketingAuthCta
                  guestLabel="Get Started for Free"
                  authLabel="Go to Dashboard"
                  className="h-11 px-6 text-sm sm:h-14 sm:px-10 sm:text-base font-semibold shadow-xl shadow-primary/20 transition-transform hover:-translate-y-0.5 rounded-xl bg-primary/90 text-primary-foreground relative z-10"
                />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="group relative p-6 rounded-[2rem] bg-card/40 border border-border/50 hover:border-primary/40 hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-200 flex flex-col justify-between gap-6 shadow-sm hover:shadow-[0_0_40px_rgba(255,107,0,0.1)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="space-y-4 relative z-10">
        <svg className="h-6 w-6 text-primary/40 group-hover:text-primary transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed italic group-hover:text-foreground/90 transition-colors">"{review.text}"</p>
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-border/40 relative z-10">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner ring-2 ring-background group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
          {review.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{review.name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500">Band {review.band}</p>
        </div>
      </div>
    </div>
  );
}
