import Link from "next/link";
import { ArrowRight, BookOpenText, Headphones, Mic2, PenSquare } from "lucide-react";
import { LandingFeaturedTests } from "@/components/marketing/landing-featured-tests";
import { LandingPricingGrid } from "@/components/marketing/landing-pricing-grid";
import { LandingReviewsMarquee } from "@/components/marketing/landing-reviews-marquee";
import { LandingScrollReveal } from "@/components/marketing/landing-scroll-reveal";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import { Button } from "@/components/ui/button";
import type { LandingFeaturedTest } from "@/components/marketing/landing-types";
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
  return (
    <div className="relative mx-auto max-w-[1600px] overflow-hidden">
      <div className="w-full px-4 pt-8 pb-0 sm:px-12 sm:pt-12 sm:pb-0 lg:px-16 lg:pt-20 lg:pb-0 origin-top transform scale-100 md:scale-[0.85] xl:scale-[0.9] transition-transform mx-auto md:-mb-[12%] xl:-mb-[8%]">
        <div className="relative z-10 w-full grid gap-12 lg:gap-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-start pt-0 md:pt-4">
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

                <LandingFeaturedTests initialTests={initialTests} />
              </div>
            </div>
          </div>
        </div>

        <section id="features" className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30 [content-visibility:auto] [contain-intrinsic-size:980px]">
          <div className="max-w-6xl mx-auto space-y-6 mb-12 text-center">
            <h2 className="text-[15px] min-[380px]:text-lg sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Online IELTS mock practice for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">every section.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-base md:text-lg leading-relaxed">
              Start with a full mock, or focus on Reading, Listening, Writing feedback, or Speaking preparation.
            </p>
          </div>

          <LandingScrollReveal className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-[1600px]">
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
          </LandingScrollReveal>
        </section>

        <LandingScrollReveal id="pricing" className="relative z-10 w-full mt-24 lg:mt-32 pt-16 border-t border-border/30 [content-visibility:auto] [contain-intrinsic-size:820px]">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Pricing that matches your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pr-2">exam timeline.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-3xl mx-auto leading-relaxed">
              Start with free public tests, then move into premium when you want explanations, writing feedback, more premium sets, and a longer IELTS prep runway.
            </p>
          </div>

          <LandingPricingGrid plans={plans} />

          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-medium border-border/60 hover:bg-muted/50 hover:text-foreground hover:scale-105 transition-[background-color,color,transform] shadow-xl bg-background/80">
              <Link href="/pricing">
                Compare all plans <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </LandingScrollReveal>

        <LandingScrollReveal
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

          <LandingReviewsMarquee reviews={reviews} />

          <div className="mt-8 flex justify-center relative z-20">
            <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-medium border-border/60 hover:bg-muted/50 hover:text-foreground hover:scale-105 transition-[background-color,color,transform] shadow-xl bg-background/80">
              <Link href="/reviews">
                View all reviews <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </LandingScrollReveal>

        <LandingScrollReveal className="relative z-10 w-full mt-0 border-t border-border/30 pt-24 pb-3 text-center flex flex-col items-center overflow-hidden [content-visibility:auto] [contain-intrinsic-size:420px]">
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
        </LandingScrollReveal>
      </div>
    </div>
  );
}
