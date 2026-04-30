import Link from "next/link";
import { ArrowRight, BookOpenText, Headphones, Play, BrainCircuit, Target, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { getDashboardAnalytics, getUserAttempts } from "@/lib/server-me";
import { mockTests } from "@/lib/mock-data";
import { DashboardAverageCards } from "./dashboard-average-cards";
import { WelcomeHeader } from "./welcome-header";
import { PremiumDashboardSpotlight } from "./premium-dashboard-spotlight";
import { cn } from "@/lib/utils";

interface InProgressTestCardState {
  title: string;
  progress: number;
  time: string;
}

function getInProgressTest(): InProgressTestCardState | null {
  return null;
}

export default async function DashboardPage() {
  const [attempts, analytics] = await Promise.all([getUserAttempts(), getDashboardAnalytics()]);
  
  const featuredTests = mockTests.slice(0, 3);
  
  // --- 1. CONTINUE TEST OR FALLBACK LOGIC ---
  // In a real app, fetch an incomplete attempt from DB. Here we mock it as null to show the fallback.
  const inProgressTest = getInProgressTest();
  // const inProgressTest = { title: "Cambridge 18 Reading Test 1", progress: 35, time: "26 min" };

  // --- 2. DYNAMIC RECOMMENDED ACTION LOGIC ---
  const now = new Date("2026-04-18"); // Mock current date
  const hasTests = attempts.length > 0;
  const lastAttempt = hasTests ? attempts[0] : null;
  
  let daysSinceLast = 0;
  if (lastAttempt) {
    const lastDate = new Date(lastAttempt.date);
    daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
  }
  
  const lastBand = lastAttempt && lastAttempt.band ? parseFloat(lastAttempt.band) : 0;
  
  // Mock weak type logic
  const weakType = analytics.errorDistribution[0]?.label ?? (lastAttempt?.type === "reading" ? "True / False / Not Given" : "Map / Diagram");
  const hasWeakType = analytics.errorDistribution.length > 0;

  let recTitle = "";
  let recDesc = "";
  let recBtnText = "";
  let recHref = "/tests";

  if (!hasTests) {
    recTitle = "Start your first test";
    recDesc = "Take your first IELTS mock test to establish your baseline score and identify your weak areas.";
    recBtnText = "Explore Tests";
  } else if (daysSinceLast > 3) {
    recTitle = "Get back on track";
    recDesc = `You haven't practiced in ${daysSinceLast} days. Consistency is key to improving your score.`;
    recBtnText = "Take a quick test";
  } else if (lastBand > 0 && lastBand < 6.0) {
    recTitle = `Practice more ${lastAttempt?.type} section`;
    recDesc = `Your last ${lastAttempt?.type} score was ${lastBand}. Try another test specifically for this section to improve.`;
    recBtnText = `Practice ${lastAttempt?.type}`;
    recHref = `/tests?type=${lastAttempt?.type}`;
  } else if (hasWeakType && lastBand >= 6.0 && lastBand < 7.5) {
    recTitle = `Improve ${weakType} questions`;
    recDesc = `Analytics show you lose points on ${weakType}. Focus your next practice on passage structure and techniques for this type.`;
    recBtnText = "Practice targeted skills";
    recHref = `/tests?type=${lastAttempt?.type}`;
  } else {
    recTitle = "Try a full mock test";
    recDesc = "You are scoring consistently well! Challenge yourself with a full mock test under strict exam conditions.";
    recBtnText = "Start Full Mock";
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-12">
      
      {/* 1. Welcome + Quick Action & Continue Test */}
      <div className="space-y-4">
        <div>
          <WelcomeHeader />
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-start">
          <div className="space-y-4">
            <div>
              {inProgressTest ? (
                <Card className="relative overflow-hidden bg-primary text-primary-foreground border-none shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                  <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    <Clock className="w-40 h-40 -rotate-12" />
                  </div>
                  <CardContent className="p-5 md:p-6 flex flex-col justify-between relative z-10">
                    <div>
                      <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 mb-3 font-bold tracking-wider uppercase text-[10px]">
                        In Progress
                      </Badge>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">{inProgressTest.title}</h2>
                      <p className="text-primary-foreground/80 font-medium mb-5 text-sm">
                        You paused this test recently. Let's finish what you started.
                      </p>
                      
                      <div className="space-y-2 max-w-sm mb-6">
                         <div className="flex justify-between text-xs font-bold text-primary-foreground/90">
                           <span>{inProgressTest.progress}% Completed</span>
                           <span>{inProgressTest.time} left</span>
                         </div>
                         <div className="h-2 w-full bg-primary-foreground/20 rounded-full overflow-hidden">
                           <div className="h-full bg-primary-foreground rounded-full" style={{ width: `${inProgressTest.progress}%` }} />
                         </div>
                      </div>
                    </div>
                    
                    <div>
                      <Button className="bg-background text-primary hover:bg-background/90 font-black px-8 h-11 rounded-xl shadow-sm transition-transform active:scale-95" asChild>
                         <Link href="/tests">
                           <Play className="mr-2 h-5 w-5 fill-current" /> Continue Test
                         </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="relative overflow-hidden bg-blue-50 dark:bg-slate-950 border border-blue-100 dark:border-border/50 shadow-sm hover:shadow-md transition-all group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-80" />
                  <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <Target className="w-40 h-40 -rotate-12 text-blue-900 dark:text-white" />
                  </div>
                  <CardContent className="p-4 md:p-5 flex flex-col justify-between relative z-10">
                    <div>
                      <Badge variant="outline" className="bg-blue-100/50 dark:bg-white/10 text-blue-800 dark:text-white border-blue-200 dark:border-white/20 mb-3 font-bold tracking-wider uppercase text-[10px] backdrop-blur-sm">
                        Recommended For You
                      </Badge>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-blue-950 dark:text-white">Ready for your next challenge?</h2>
                      <p className="text-blue-800/80 dark:text-white/70 font-medium mb-4 text-sm max-w-md">
                        Take the latest Cambridge Official test to measure your true band score under real exam conditions.
                      </p>
                    </div>
                    
                    <div>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-11 rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95" asChild>
                         <Link href="/tests">
                           <Play className="mr-2 h-5 w-5 fill-current" /> Start Cambridge 18
                         </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DashboardAverageCards initialAnalytics={analytics} />

            <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 shadow-sm relative overflow-hidden rounded-2xl group">
              <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none">
                <BrainCircuit className="w-24 h-24 text-amber-600" />
              </div>
              <CardContent className="p-5 relative z-10 flex flex-col justify-center h-full">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="bg-amber-500/20 p-1.5 rounded-md">
                    <BrainCircuit className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  </div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">Recommended Next Step</h3>
                </div>
                <p className="font-semibold text-foreground text-base leading-tight mb-1.5">{recTitle}</p>
                <p className="text-xs font-medium text-muted-foreground mb-3 leading-5">
                  {recDesc}
                </p>
                <Button asChild size="sm" className="w-fit bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-md transition-transform active:scale-95">
                  <Link href={recHref}>{recBtnText} <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Start Cards */}
          <div className="flex flex-col gap-4">
            <PremiumDashboardSpotlight />

            <Link href="/tests?type=reading" className="block">
              <Card className="bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 transition-colors shadow-sm flex items-center p-4 cursor-pointer group rounded-2xl">
                <div className="bg-blue-500/10 p-3 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                  <BookOpenText className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-950 dark:text-blue-100 text-sm">Start Reading Test</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/80 mt-0.5">Academic · 60 min</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-blue-500/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </Card>
            </Link>
            
            <Link href="/tests?type=listening" className="block">
              <Card className="bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 transition-colors shadow-sm flex items-center p-4 cursor-pointer group rounded-2xl">
                <div className="bg-emerald-500/10 p-3 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                  <Headphones className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-950 dark:text-emerald-100 text-sm">Start Listening Test</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/80 mt-0.5">Academic · 30 min</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-emerald-500/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </Card>
            </Link>
          </div>
        </div>
      </div>

      <DashboardCharts analytics={analytics} />

      {/* 4 & 5. Recent Activity & Featured Tests */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
        
        {/* Left: Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Activity</h2>
            <Button variant="link" asChild className="text-primary font-bold px-0 h-auto">
              <Link href="/history">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          
          <Card className="border-border/40 shadow-sm overflow-hidden rounded-3xl bg-card/30">
            <div className="divide-y divide-border/40">
              {attempts.slice(0, 4).map(attempt => (
                <div key={attempt.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={cn(
                       "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner", 
                       attempt.type === "reading" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                     )}>
                       {attempt.type === "reading" ? <BookOpenText className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
                     </div>
                     <div className="space-y-1">
                       <h4 className="font-bold text-foreground text-[15px]">{attempt.testTitle}</h4>
                       <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                         <span>{attempt.date}</span>
                         <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                         <span className="text-foreground/70">{attempt.mode}</span>
                       </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-6 sm:gap-8 border-t sm:border-t-0 pt-4 sm:pt-0 border-border/40 mt-2 sm:mt-0">
                     <div className="text-right">
                       <p className="font-black text-foreground text-lg">{attempt.score}</p>
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Score</p>
                     </div>
                     <div className="text-right border-l border-border/50 pl-6">
                       <p className="font-black text-primary text-lg">{attempt.band ?? "-"}</p>
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Band</p>
                     </div>
                     <Button asChild variant="outline" size="sm" className="rounded-xl h-9 px-4 font-bold border-border/60 shadow-sm hover:bg-muted ml-2">
                       <Link href={`/attempts/${attempt.id}/result`}>Review</Link>
                     </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Featured / Quick Tests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Quick Tests</h2>
            <Button variant="link" asChild className="text-primary font-bold px-0 h-auto">
              <Link href="/tests">Browse <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          
          <div className="space-y-3">
            {featuredTests.map(test => {
              const isReading = test.type === "reading";
              return (
                <Link key={test.id} href="/tests" className="block">
                  <Card className="p-4 border-border/40 shadow-sm hover:border-primary/30 transition-all hover:shadow-md cursor-pointer group rounded-2xl bg-card/30">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", 
                        isReading ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {isReading ? <BookOpenText className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-bold text-[14px] text-foreground truncate">{test.title}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          {test.source.replace("Official", "").trim()}
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          {test.estimatedMinutes}m
                        </p>
                      </div>
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm",
                        isReading ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                      )}>
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
