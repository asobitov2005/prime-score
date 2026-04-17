import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, TimerReset, Layers3, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCatalogTestDetail } from "@/lib/server-data";
import { StartTestButton } from "./start-buttons";

interface TestStartRoutePageProps {
  params: {
    testId: string;
  };
}

export default async function TestStartPage({ params }: TestStartRoutePageProps) {
  const { testId } = params;
  const test = await getCatalogTestDetail(testId);

  if (!test) {
    notFound();
  }

  const isFullTest = test.format === "full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Blurred Glass Background */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-xl transition-all duration-500" />
      
      {/* Animated Modal Container */}
      <div className="relative w-full max-w-4xl my-auto animate-in zoom-in-95 fade-in duration-300 ease-out shadow-2xl">
        <Card className="overflow-hidden border-border/50 bg-background/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative">
          
          {/* Close Button */}
          <Link 
            href="/tests" 
            className="absolute top-6 right-6 z-20 p-2.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title="Close"
          >
            <X className="h-6 w-6" />
          </Link>

          {/* Top subtle gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

          <div className="p-8 md:p-12 space-y-12">
            
            {/* Header Info */}
            <div className="space-y-5 pr-14 text-center md:text-left">
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2.5">
                <Badge tone={test.type === "reading" ? "info" : "success"} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest bg-opacity-20 border-none shadow-sm">
                  {test.type}
                </Badge>
                <Badge tone="neutral" className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest bg-muted/60 text-foreground border-border/60 shadow-sm">
                  {isFullTest ? "Full Test" : test.format.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-[1.15]">{test.title}</h1>
            </div>

            {/* Mode Selection */}
            {isFullTest ? (
              <div className="space-y-6">
                <div className="mb-4 text-center md:text-left">
                   <h2 className="text-2xl font-bold text-foreground">Select Mode</h2>
                   <p className="text-muted-foreground mt-1 text-sm">Choose how you want to experience this full test.</p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-border/60 bg-card/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all rounded-3xl flex flex-col group">
                    <CardHeader className="pb-5 pt-8 flex-1 items-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <TimerReset className="h-7 w-7" />
                      </div>
                      <CardTitle className="text-2xl font-black">Practice Mode</CardTitle>
                      <CardDescription className="text-[15px] mt-2">Flexible timer, no strict rules.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pb-8 px-8">
                      <ul className="text-[15px] text-muted-foreground space-y-4 font-medium mx-auto max-w-[200px] text-left">
                        <li className="flex items-center gap-3"><svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Pause allowed anytime</li>
                        <li className="flex items-center gap-3"><svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> No full-screen forced</li>
                        <li className="flex items-center gap-3"><svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Timer counts up</li>
                      </ul>
                      <StartTestButton testId={test.id} testType={test.type} mode="practice" scope="full" label="Start Practice" variant="default" className="h-14 text-lg font-black bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 dark:shadow-none transition-all rounded-2xl border-0" />
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 bg-primary/5 shadow-md relative overflow-hidden rounded-3xl flex flex-col group">
                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl shadow-sm z-10">Strict Exam</div>
                    
                    {/* Pulsing red glow effect */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-red-500/20 transition-all duration-500" />
                    
                    <CardHeader className="pb-5 pt-8 flex-1 items-center text-center relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Play className="h-7 w-7 fill-current" />
                      </div>
                      <CardTitle className="text-2xl font-black text-foreground">Exam Mode</CardTitle>
                      <CardDescription className="text-[15px] mt-2 text-foreground/70">Real IELTS conditions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pb-8 px-8 relative z-10">
                      <ul className="text-[15px] text-muted-foreground space-y-4 font-medium mx-auto max-w-[200px] text-left">
                        <li className="flex items-center gap-3"><svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg> No pauses allowed</li>
                        <li className="flex items-center gap-3"><svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg> Full-screen enforced</li>
                        <li className="flex items-center gap-3"><svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg> Auto-submit on exit</li>
                      </ul>
                      <StartTestButton testId={test.id} testType={test.type} mode="exam" scope="full" label="Start Exam" variant="default" className="h-14 text-lg shadow-xl shadow-primary/30 hover:shadow-primary/40 text-background bg-primary hover:brightness-110 rounded-2xl border-0 font-black" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-4 animate-in fade-in duration-700 text-center max-w-lg mx-auto pb-4">
                 <div className="w-24 h-24 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Layers3 className="h-12 w-12" />
                 </div>
                 <h2 className="text-3xl font-black mb-4">Practice Session</h2>
                 <p className="text-muted-foreground text-lg mb-12 leading-relaxed font-medium">
                   This is a focused practice session for a specific part of the test. You can take your time and pause when needed.
                 </p>
                 <StartTestButton testId={test.id} testType={test.type} mode="practice" scope="section" sectionId={test.sections[0]?.id} label="Begin Practice Session" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 border-0" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
