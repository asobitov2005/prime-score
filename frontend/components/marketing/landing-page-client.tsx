"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenText, CheckCircle2, Headphones, ShieldCheck, Zap } from "lucide-react";
import { PricingPlanGrid } from "@/components/marketing/pricing-plan-grid";
import { Button } from "@/components/ui/button";
import { mockTests, type ReviewItem } from "@/lib/mock-data";
import type { MarketingPlan } from "@/lib/server-plans";
import { cn } from "@/lib/utils";

const skills = ["Reading.", "Listening.", "Writing.", "Speaking."];

interface LandingPageClientProps {
  plans: MarketingPlan[];
  reviews: ReviewItem[];
}

export function LandingPageClient({ plans, reviews }: LandingPageClientProps) {
  const [skillIndex, setSkillIndex] = useState(0);
  const [isReviewsVisible, setIsReviewsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setSkillIndex((current) => (current + 1) % skills.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    let filtered = mockTests;

    if (activeTab !== "All") {
      filtered = mockTests.filter((test) => test.type.toLowerCase() === activeTab.toLowerCase());
      return filtered.slice(0, 4);
    }

    const readingTests = mockTests.filter((test) => test.type === "reading").slice(0, 2);
    const listeningTests = mockTests.filter((test) => test.type === "listening").slice(0, 2);

    return [...readingTests, ...listeningTests].slice(0, 4);
  };

  const displayedTests = getDisplayedTests();

  return (
    <div className="relative mx-auto max-w-[1600px] overflow-hidden">
      <div className="w-full px-8 pt-12 pb-0 sm:px-12 lg:px-16 lg:pt-20 lg:pb-0 origin-top transform scale-[0.9] md:scale-[0.85] xl:scale-[0.9] transition-transform">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-in fade-in duration-1000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-in fade-in duration-1000 delay-500" />

        <section className="relative z-10 w-full grid gap-12 lg:gap-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-start pt-0 md:pt-4">
          <div className="space-y-8 md:space-y-10">
            <div className="space-y-4">
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out fill-mode-both">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-md backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                    Free IELTS Mock Tests
                  </span>
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 ease-out fill-mode-both flex flex-col">
                <span>Master your</span>
                <span className="relative h-[1.15em] overflow-hidden inline-block w-full">
                  {skills.map((skill, index) => (
                    <span
                      key={skill}
                      className={cn(
                        "absolute top-0 left-0 bg-gradient-to-r from-primary/80 via-primary to-primary/60 bg-clip-text text-transparent transition-all duration-700 ease-in-out pb-2",
                        index === skillIndex
                          ? "translate-y-0 opacity-100"
                          : index < skillIndex
                            ? "-translate-y-full opacity-0"
                            : "translate-y-full opacity-0",
                      )}
                    >
                      {skill}
                    </span>
                  ))}
                </span>
              </h1>

              <p className="text-base sm:text-lg font-medium text-muted-foreground/90 max-w-xl leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 ease-out fill-mode-both">
                Experience the most authentic computer-delivered IELTS simulation.
                Track your band score, review detailed analytics, and study with focus.
              </p>

              <div className="flex flex-wrap items-center gap-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-400 ease-out fill-mode-both">
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
                          "flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background text-[10px] font-black text-white shadow-sm",
                          user.bg,
                        )}
                      >
                        {user.initial}
                      </div>
                    ))}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-primary text-[9px] font-black text-primary-foreground">
                      +2k
                    </div>
                  </div>
                  <div className="flex flex-col -space-y-0.5">
                    <span className="text-[13px] font-black text-foreground">2,481+ online</span>
                    <p className="text-[10px] font-bold text-muted-foreground/70 tracking-tight">Active students</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-0 md:pl-4 border-l-0 md:border-l border-border/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col -space-y-0.5">
                    <span className="text-[13px] font-black text-foreground">120+ Full Tests</span>
                    <p className="text-[10px] font-bold text-muted-foreground/70 tracking-tight">Authentic practice</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 ease-out fill-mode-both">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 px-10 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 hover:-translate-y-1 rounded-2xl bg-primary text-background">
                <Link href="/login">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-10 text-base font-bold border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 rounded-2xl transition-all hover:scale-105">
                <Link href="#features">
                  View Features
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative w-full max-w-lg mx-auto mt-0 lg:-mt-6 xl:ml-auto animate-in fade-in slide-in-from-right-10 duration-1000 delay-300 ease-out fill-mode-both">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-full blur-[80px] -z-10" />

            <div className="relative rounded-3xl border border-white/10 bg-background/60 backdrop-blur-2xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] transition-all duration-700 overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />

              <div className="p-6 md:p-8 space-y-5 relative z-10 pt-8">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-lg md:text-xl tracking-tight text-[#0a1b3f] dark:text-foreground">Featured Tests</h3>
                  <Link href="/tests" className="flex items-center gap-1 text-[13px] font-bold text-[#d94b04] hover:text-[#d94b04]/80 transition-colors">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="bg-[#f5f2eb] dark:bg-muted/20 p-1.5 rounded-[1.25rem] flex items-center justify-between overflow-x-auto no-scrollbar border border-border/5 shadow-inner">
                  {["All", "Reading", "Listening"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-[13px] md:text-[14px] font-black rounded-xl transition-all duration-300 whitespace-nowrap",
                        activeTab === tab
                          ? "bg-white dark:bg-[#0a1b3f] text-[#0a1b3f] dark:text-primary shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12)] border border-white dark:border-primary/20 scale-[1.02]"
                          : "text-[#7b8390] dark:text-muted-foreground/50 hover:text-[#0a1b3f] dark:hover:text-foreground",
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
                      <div
                        key={test.id}
                        className={cn(
                          "group flex items-center justify-between gap-4 p-3 md:p-4 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer",
                          cardBg,
                          cardBorder,
                        )}
                        onClick={() => {
                          window.location.href = "/tests";
                        }}
                      >
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                          <div className={cn("flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300", iconBgColor, iconColor)}>
                            {isReading ? (
                              <BookOpenText className="h-5 w-5 md:h-6 md:w-6" />
                            ) : isListening ? (
                              <Headphones className="h-5 w-5 md:h-6 md:w-6" />
                            ) : (
                              <span className="font-serif font-bold text-base md:text-lg">W</span>
                            )}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="font-bold text-[14px] md:text-[15px] text-foreground leading-tight truncate">{test.title}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] md:text-[12px] font-medium text-muted-foreground/80">
                              <span className="uppercase tracking-wider font-bold">{test.source.replace("Official", "").trim()}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span>{test.questionCount} questions</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span>{test.estimatedMinutes} min</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 pl-1">
                          <span className={cn("hidden sm:flex px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider shadow-sm", badgeBg, badgeText)}>
                            {badgeLabel}
                          </span>
                          <div className="flex h-10 w-10 items-center justify-center text-[#0a1b3f] dark:text-foreground/80 transition-all duration-300 group-hover:scale-125 group-hover:text-[#d94b04] dark:group-hover:text-primary">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M18.4452 11.0253C19.1837 11.4554 19.1837 12.5446 18.4452 12.9747L7.66492 19.2598C6.9264 19.6899 6 19.1504 6 18.2851L6 5.71493C6 4.8496 6.9264 4.31012 7.66492 4.74021L18.4452 11.0253Z"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="p-6 text-center text-sm font-bold text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/50">
                      No tests found for {activeTab}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1]">
              Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">Succeed.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-2xl mx-auto">
              We provide the tools, you provide the dedication.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-1000 delay-700 fill-mode-both">
            <div className="p-6 rounded-[2rem] bg-card border border-border/50 hover:bg-muted/30 transition-all hover:-translate-y-1 hover:shadow-lg shadow-sm flex flex-col gap-5 group">
              <div className="bg-primary/10 p-3.5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground mb-2">Real exam conditions</h3>
                <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed">
                  Experience IELTS-style timing and interface for accurate practice.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-card border border-border/50 hover:bg-muted/30 transition-all hover:-translate-y-1 hover:shadow-lg shadow-sm flex flex-col gap-5 group">
              <div className="bg-blue-500/10 p-3.5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <BookOpenText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground mb-2">Reading & Listening</h3>
                <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed">
                  Practice both sections with authentic question types.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-card border border-border/50 hover:bg-muted/30 transition-all hover:-translate-y-1 hover:shadow-lg shadow-sm flex flex-col gap-5 group">
              <div className="bg-amber-500/10 p-3.5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground mb-2">Instant band score</h3>
                <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed">
                  Get your estimated band score immediately after completion.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-card border border-border/50 hover:bg-muted/30 transition-all hover:-translate-y-1 hover:shadow-lg shadow-sm flex flex-col gap-5 group">
              <div className="bg-emerald-500/10 p-3.5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground mb-2">Detailed answer review</h3>
                <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed">
                  See correct answers with highlighted text to understand your mistakes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1]">
              Pricing that matches your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">exam timeline.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-3xl mx-auto leading-relaxed">
              Start with free public tests, then move into premium when you want explanations, more premium sets, and a longer IELTS prep runway.
            </p>
          </div>

          <PricingPlanGrid plans={plans} compact />

          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-bold border-border/60 hover:bg-muted/50 hover:text-foreground hover:scale-105 transition-all shadow-xl bg-background/80 backdrop-blur-md">
              <Link href="/pricing">
                Compare all plans <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section
          id="reviews"
          ref={reviewsRef}
          className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30 pb-20"
        >
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1]">
              Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">Students.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-2xl mx-auto">
              See how PrimeScore is helping students achieve their target band scores.
            </p>
          </div>

          <div
            className={cn("relative h-[600px] overflow-hidden", isReviewsVisible ? "opacity-100" : "opacity-0 transition-opacity duration-1000")}
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full px-2">
              <div className="flex flex-col gap-6 animate-marquee-down hover:[animation-play-state:paused]">
                {[...reviews, ...reviews].map((review, index) => (
                  <ReviewCard key={`col1-${index}`} review={review} />
                ))}
              </div>

              <div className="hidden md:flex flex-col gap-6 animate-marquee-up hover:[animation-play-state:paused]">
                {[...reviews].reverse().concat([...reviews].reverse()).map((review, index) => (
                  <ReviewCard key={`col2-${index}`} review={review} />
                ))}
              </div>

              <div className="hidden md:flex flex-col gap-6 animate-marquee-down hover:[animation-play-state:paused]">
                {[...reviews.slice(3), ...reviews.slice(0, 3), ...reviews.slice(3), ...reviews.slice(0, 3)].map((review, index) => (
                  <ReviewCard key={`col3-${index}`} review={review} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center relative z-20">
            <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-bold border-border/60 hover:bg-muted/50 hover:text-foreground hover:scale-105 transition-all shadow-xl bg-background/80 backdrop-blur-md">
              <Link href="/reviews">
                View all reviews <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="relative z-10 w-full mt-4 lg:mt-6 pt-6 pb-0 border-t border-border/30 text-center flex flex-col items-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Ready to Practice Like It's the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">Real Exam?</span>
            </h2>
            <p className="text-lg md:text-xl font-medium text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
              Experience strict test conditions, instant scoring, and focused practice.
            </p>

            <div className="pt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <Button asChild size="lg" className="h-14 px-10 text-base font-bold shadow-2xl shadow-primary/20 transition-all hover:scale-105 hover:-translate-y-1 rounded-2xl bg-primary text-background">
                <Link href="/login">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="p-6 rounded-[2rem] bg-card/40 border border-border/50 hover:border-primary/30 transition-all flex flex-col justify-between gap-6 shadow-sm">
      <div className="space-y-4">
        <svg className="h-6 w-6 text-primary/20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">"{review.text}"</p>
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-border/40">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black shadow-inner ring-2 ring-background">
          {review.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{review.name}</p>
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Band {review.band}</p>
        </div>
      </div>
    </div>
  );
}
