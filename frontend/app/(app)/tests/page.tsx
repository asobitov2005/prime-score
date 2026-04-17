import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCatalogTests } from "@/lib/server-data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TestsPageProps {
  searchParams?: {
    type?: string;
    access?: string;
    format?: string;
  };
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const type = searchParams?.type;
  const access = searchParams?.access;
  const format = searchParams?.format;
  
  // Fetch from server
  const rawTests = await getCatalogTests({ type, access, format });
  const tests = rawTests;

  const formatDisplay = (testFormat: string) => {
    if (!testFormat || testFormat === "full") return "Full Test";
    if (testFormat === "part") return "Part Level";
    const parts = testFormat.split("_");
    if (parts.length === 2) {
       return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + parts[1];
    }
    return testFormat;
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        <CardHeader className="space-y-2 relative z-10 p-6 lg:px-10 lg:pt-10 lg:pb-6 border-b border-border/40 bg-muted/10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Practice Tests</CardTitle>
              <CardDescription className="text-muted-foreground text-base font-medium">
                Select a test below to begin your practice or simulate a real exam.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Search className="h-6 w-6 stroke-[2.5]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] p-6 lg:px-10 lg:py-6 relative z-10 bg-background/50">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
            <Input placeholder="Search tests by title..." className="pl-12 h-12 text-base border-border/60 bg-muted/30 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary shadow-inner rounded-xl transition-all hover:bg-muted/50 focus:bg-background" />
          </div>
          <Button variant="outline" className="h-12 px-6 text-sm font-bold rounded-xl shadow-sm border-border/60 bg-muted/30 text-foreground hover:bg-muted/80">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2.5 pb-4 px-2">
        {[
          { label: "All", href: "/tests" },
          { label: "Full Tests", href: "/tests?format=full" },
          { label: "Practice Passage", href: "/tests?format=part" },
          { label: "Reading", href: "/tests?type=reading" },
          { label: "Listening", href: "/tests?type=listening" }
        ].map((item) => {
          const isActive = 
            (item.label === "Full Tests" && format === "full") ||
            (item.label === "Practice Passage" && format === "part") ||
            (item.label === "Reading" && type === "reading") ||
            (item.label === "Listening" && type === "listening") ||
            (item.label === "All" && !type && !access && !format);
            
          return (
            <Button 
              key={item.label} 
              asChild 
              variant={isActive ? "solid" : "outline"} 
              size="sm" 
              className={cn(
                "rounded-xl font-bold text-[13px] tracking-wide transition-all h-10 px-5", 
                isActive 
                  ? "shadow-md bg-primary text-background border-none" 
                  : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card"
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          );
        })}
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-24 bg-card/20 rounded-3xl border border-dashed border-border/60">
          <div className="inline-flex p-5 rounded-full bg-muted/40 mb-4 ring-1 ring-border/50">
             <Search className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <p className="text-xl font-black text-foreground">No tests found.</p>
          <p className="text-base font-medium text-muted-foreground mt-1">Try changing your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3 pt-2">
          {tests.map((test) => {
            const attemptsCount = test.id.length * 42 + test.title.length * 15;
            const addedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

            return (
            <Card key={test.id} className="group overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 border-border/50 bg-card rounded-[2rem] flex flex-col relative">
              
              {test.accessType === "premium" && (
                <div className="absolute top-6 right-6 z-20">
                  <div className="bg-background/80 backdrop-blur-md text-amber-500 p-2.5 rounded-2xl shadow-sm border border-border/50 flex items-center justify-center" title="Premium Access Required">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                </div>
              )}

              <CardHeader className="space-y-5 pb-6 flex-1 p-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5 mb-1">
                    <span className={cn(
                      "px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl shadow-sm border border-transparent",
                      test.type === "reading" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    )}>
                      {test.type}
                    </span>
                    <span className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl bg-muted text-foreground border border-border/50 shadow-sm">
                      {formatDisplay(test.format)}
                    </span>
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-black tracking-tight text-foreground leading-[1.2] group-hover:text-primary transition-colors line-clamp-2">
                    {test.title}
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8 p-8 pt-0 bg-background flex flex-col justify-between">
                
                <div className="flex items-center gap-6 text-[13px] font-bold text-muted-foreground/70 border-t border-border/40 pt-8">
                  <div className="flex items-center gap-2" title="Total attempts">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                    <span>{attemptsCount.toLocaleString()} attempts</span>
                  </div>
                  <div className="flex items-center gap-2" title="Added date">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>{addedDate}</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button asChild className="w-full h-14 text-base font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-1 bg-primary text-background border-0 flex items-center justify-center gap-3 group/btn">
                    {test.format === "full" ? (
                       <Link href={`/tests/${test.id}/start`}>
                         Start Full Test
                         <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                       </Link>
                    ) : (
                       <Link href={`/tests/${test.id}/start`}>
                         Start Practice
                         <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                       </Link>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
